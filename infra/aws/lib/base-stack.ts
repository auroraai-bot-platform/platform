import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';

export class BaseStack extends cdk.Stack {
  public readonly baseVpc: ec2.IVpc
  public readonly baseAlb: elbv2.IApplicationLoadBalancer
  //public readonly baseSecurityGroup: ec2.ISecurityGroup
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // s3 import bucket
    // login to bucket with x

    // GitHub hook + deploy key
    // Nat gateway

    this.baseVpc = new ec2.Vpc(this, 'network', {
      maxAzs: 2
    });

    const baseSecurityGroup = new ec2.SecurityGroup(this, 'sg', {
      vpc: this.baseVpc,
      description: 'Gofore VPN access'
    });

    baseSecurityGroup.addIngressRule(ec2.Peer.ipv4('81.175.255.179/32'), ec2.Port.allTraffic(), 'HKI');
    baseSecurityGroup.addIngressRule(ec2.Peer.ipv4('193.64.225.83/32'), ec2.Port.allTraffic(), 'TAM');
    baseSecurityGroup.addIngressRule(ec2.Peer.ipv4('212.226.154.19/32'), ec2.Port.allTraffic(), 'JKL');
    baseSecurityGroup.addIngressRule(ec2.Peer.ipv4('79.134.113.123/32'), ec2.Port.allTraffic(), 'TKU');

    new cdk.CfnOutput(this, 'Sg-id-output', {
      description: 'Security group in Stack A',
      exportName: 'base-security-group-id',
      value: baseSecurityGroup.securityGroupId
    });

    const albSG = new ec2.SecurityGroup(this, `alb-sg`, {
      vpc: this.baseVpc,
      allowAllOutbound: true,
      securityGroupName: `alb-sg`
    });

    new cdk.CfnOutput(this, 'alb-sg-id-output', {
      description: 'Security group for load balancer',
      exportName: 'alb-security-group-id',
      value: albSG.securityGroupId
    });

    this.baseAlb = new elbv2.ApplicationLoadBalancer(this, `basealb`, {
      vpc: this.baseVpc,
      internetFacing: true,
      securityGroup: albSG
    });

  }
}
