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
import { IApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';

interface Ec2Props extends BaseStackProps {
    baseAlb: IApplicationLoadBalancer,
    baseVpc: ec2.IVpc,
    subDomain: string,
    domain: string,
    ports: {
      botfront: number;
      rasa: number;
      actions: number;
    }
  }

export class Ec2Stack extends cdk.Stack {
  public readonly hostIp: string;
  public readonly domain: string;

  constructor(scope: cdk.Construct, id: string, props: Ec2Props) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);

    const apiDomain = `api.${props.subDomain}`;

    const hostSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'basesg', cdk.Fn.importValue('base-security-group-id'));
    const albSG = ec2.SecurityGroup.fromSecurityGroupId(this, 'albsg', cdk.Fn.importValue('alb-security-group-id'));

    const role = new iam.Role(this, `${prefix}BaseRole`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));

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
    host.connections.allowFrom(albSG, ec2.Port.tcp(props.ports.rasa));
    host.connections.allowFrom(albSG, ec2.Port.tcp(props.ports.botfront));
    host.connections.allowFrom(albSG, ec2.Port.tcp(props.ports.actions));


    new CfnOutput(this, 'ip-address', {
        value: host.instancePublicIp
    });

    const hostedZone = route53.HostedZone.fromLookup(this, `${prefix}hostedZone`, {domainName: props.domain});
    
    const certificate = new acm.Certificate(this, `${prefix}hosted-zone-certificate`, {
      domainName: apiDomain,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(props.ports.rasa));
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(props.ports.botfront));
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(props.ports.actions));

    const rasaListener = props.baseAlb.addListener(`${prefix}rasa-listener`, {
      port: props.ports.rasa,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const botfrontListener = props.baseAlb.addListener(`${prefix}botfront-listener`, {
      port: props.ports.botfront,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const rasaActionsListener = props.baseAlb.addListener(`${prefix}rasa-actions-listener`, {
      port: props.ports.actions,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      open: true,
      certificates: [certificate]
    });

    const rasaTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}rasa-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: props.ports.rasa,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, props.ports.rasa)]
    });

    const botfrontTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}botfront-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: props.ports.botfront,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, props.ports.botfront)]
    });

    const rasaActionsTargetGroup = new elbv2.ApplicationTargetGroup(this, `${prefix}rasa-actions-targetgroup`, {
      targetType: elbv2.TargetType.INSTANCE,
      port: props.ports.actions,
      protocol: elbv2.ApplicationProtocol.HTTP,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      vpc: props.baseVpc,
      targets: [new elbv2Targets.InstanceTarget(host, props.ports.actions)]
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
      recordName: `api.${props.envName}`,
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(props.baseAlb))
    });
    

    this.hostIp = host.instancePublicIp;
    this.domain = apiDomain;
  }
}