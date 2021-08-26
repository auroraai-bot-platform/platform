import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr'
import * as ec2 from '@aws-cdk/aws-ec2';
import { CfnOutput } from '@aws-cdk/core';
import { BaseStackProps } from '../types';
import { createPrefix } from './utilities';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as elbv2Targets from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53Targets from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as iam from '@aws-cdk/aws-iam';

interface Ec2Props extends BaseStackProps {
    baseRepo: ecr.IRepository,
    baseVpc: ec2.IVpc,
    subDomain: string,
    domain: string
  }

const rasaPort = 5005;
const botfrontPort = 8888;
const rasaActionsPort = 5055;

export class Ec2Stack extends cdk.Stack {
  public readonly hostIp: string;
  public readonly domain: string;

  constructor(scope: cdk.Construct, id: string, props: Ec2Props) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);

    const apiDomain = `api.${props.subDomain}`;

    const hostSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'basesg', cdk.Fn.importValue('base-security-group-id'));

    const albSG = new ec2.SecurityGroup(this, `${prefix}alb-sg`, {
      vpc: props.baseVpc,
      allowAllOutbound: true,
      securityGroupName: `${prefix}alb-sg`
    });

    const script = `
    #!/bin/bash
    yum update -y
    amazon-linux-extras install docker python3.8 -y
    yum install git curl -y
    service docker start
    chkconfig docker on
    curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    usermod -a -G docker ec2-user
    su ec2-user bash -c 'wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash'
    su ec2-user bash -c 'source ~/.bashrc && nvm install lts/erbium'
    usermod -a -G docker ssm-user
    su ssm-user bash -c 'wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash'
    su ssm-user bash -c 'source ~/.bashrc && nvm install lts/erbium'
    `

    const userdata = ec2.UserData.custom(script);

    const role = new iam.Role(this, 'MyRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    const host = new ec2.Instance(this, 'botfront-full', {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
        machineImage: ec2.MachineImage.latestAmazonLinux({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            cpuType: ec2.AmazonLinuxCpuType.X86_64,
            storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE
        }),
        blockDevices: [
          {
            deviceName: '/dev/xvda',
            volume: ec2.BlockDeviceVolume.ebs(20),
          }
        ],
        vpc: props.baseVpc,
        vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
        keyName: 'aurora-ai',
        userData: userdata,
        instanceName: `${prefix}botfront-full`,
        role
    });

    host.addSecurityGroup(hostSG);
    host.connections.allowFrom(albSG, ec2.Port.tcp(rasaPort));
    host.connections.allowFrom(albSG, ec2.Port.tcp(botfrontPort));
    host.connections.allowFrom(albSG, ec2.Port.tcp(rasaActionsPort));


    new CfnOutput(this, 'ip-address', {
        value: host.instancePublicIp
    });

    const hostedZone = route53.HostedZone.fromLookup(this, 'hostedZone', {domainName: props.domain});
    
    const certificate = new acm.Certificate(this, `${prefix}hosted-zone-certificate`, {
      domainName: apiDomain,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(rasaPort));
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(botfrontPort));
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(rasaActionsPort));

    const alb = new elbv2.ApplicationLoadBalancer(this, `${prefix}alb`, {
      vpc: props.baseVpc,
      internetFacing: true,
      securityGroup: albSG
    });

    const rasaListener = alb.addListener(`${prefix}rasa-listener`, {
      port: rasaPort,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const botfrontListener = alb.addListener(`${prefix}botfront-listener`, {
      port: botfrontPort,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const rasaActionsListener = alb.addListener(`${prefix}rasa-actions-listener`, {
      port: rasaActionsPort,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const rasaTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}rasa-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: rasaPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, rasaPort)]
    });

    const botfrontTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}botfront-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: botfrontPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, botfrontPort)]
    });

    const rasaActionsTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}rasa-actions-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: rasaActionsPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, rasaActionsPort)]
    });

    rasaListener.addTargetGroups(`${prefix}rasa-listener-assignment`, {
      targetGroups: [rasaTargetGroup]
    });

    botfrontListener.addTargetGroups(`${prefix}botfront-listener-assignment`, {
      targetGroups: [botfrontTargetGroup]
    });

    rasaActionsListener.addTargetGroups(`${prefix}rasa-actions-listener-assignment`, {
      targetGroups: [rasaActionsTargetGroup]
    });


    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: 'api.demo',
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(alb))
    });
    

    this.hostIp = host.instancePublicIp;
    this.domain = apiDomain;
  }
}