import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ec2 from '@aws-cdk/aws-ec2';

export class BaseStack extends cdk.Stack {
  public readonly baseVpc: ec2.IVpc
  public readonly baseRepo: ecr.IRepository
  //public readonly baseSecurityGroup: ec2.ISecurityGroup
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.baseRepo = new ecr.Repository(this, 'Repo', {
      imageScanOnPush: true,
      repositoryName: 'aurora-bot-images',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // s3 import bucket
    // login to bucket with x

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

    const sgOutput = new cdk.CfnOutput(this, 'Sg-id-output', {
      description: 'Security group in Stack A',
      exportName: 'base-security-group-id',
      value: baseSecurityGroup.securityGroupId
    });

  }
}
