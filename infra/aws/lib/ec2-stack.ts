import * as cdk from '@aws-cdk/core';
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
    baseVpc: ec2.IVpc,
    subDomain: string,
    domain: string,
  }

export class Ec2Stack extends cdk.Stack {
  public readonly hostIp: string;
  public readonly domain: string;

  constructor(scope: cdk.Construct, id: string, props: Ec2Props) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);

    const ports = {'rasa': 5005, 'botfront': 8888, 'actions': 5055}
    const apiDomain = `api.${props.subDomain}`;

    const hostSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'basesg', cdk.Fn.importValue('base-security-group-id'));

    const role = new iam.Role(this, `${prefix}BaseRole`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));

    const albSG = new ec2.SecurityGroup(this, `${prefix}alb-sg`, {
      vpc: props.baseVpc,
      allowAllOutbound: true,
      securityGroupName: `${prefix}alb-sg`
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, `${prefix}alb`, {
      vpc: props.baseVpc,
      internetFacing: true,
      securityGroup: albSG
    });

    const host = new ec2.Instance(this, `${prefix}botfront-full`, {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
        machineImage: ec2.MachineImage.genericLinux({
          'eu-north-1': 'ami-02ef1b7a57947599c'
        }
        ),
        vpc: props.baseVpc,
        vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
        keyName: 'aurora-ai',
        instanceName: `${prefix}botfront-full`,
        role
    });

    host.addSecurityGroup(hostSG);
    host.connections.allowFrom(albSG, ec2.Port.tcp(ports.rasa));
    host.connections.allowFrom(albSG, ec2.Port.tcp(ports.botfront));
    host.connections.allowFrom(albSG, ec2.Port.tcp(ports.actions));


    new CfnOutput(this, 'ip-address', {
        value: host.instancePublicIp
    });

    const hostedZone = route53.HostedZone.fromLookup(this, `${prefix}hostedZone`, {domainName: props.domain});
    
    const certificate = new acm.Certificate(this, `${prefix}hosted-zone-certificate`, {
      domainName: apiDomain,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(ports.rasa));
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(ports.botfront));
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(ports.actions));

    const rasaListener = alb.addListener(`${prefix}rasa-listener`, {
      port: ports.rasa,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const botfrontListener = alb.addListener(`${prefix}botfront-listener`, {
      port: ports.botfront,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const rasaActionsListener = alb.addListener(`${prefix}rasa-actions-listener`, {
      port: ports.actions,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const rasaTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}rasa-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: ports.rasa,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, ports.rasa)]
    });

    const botfrontTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}botfront-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: ports.botfront,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, ports.botfront)]
    });

    const rasaActionsTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}rasa-actions-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: ports.actions,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, ports.actions)]
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


    new route53.ARecord(this, `${prefix}AliasRecord`, {
      zone: hostedZone,
      recordName: `api.${props.envName}`,
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(alb))
    });
    

    this.hostIp = host.instancePublicIp;
    this.domain = apiDomain;
  }
}