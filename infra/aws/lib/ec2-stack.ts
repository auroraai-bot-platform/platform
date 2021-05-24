import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr'
import * as ec2 from '@aws-cdk/aws-ec2';
import { CfnOutput } from '@aws-cdk/core';

interface Ec2Props extends cdk.StackProps {
    baseRepo: ecr.IRepository,
    baseVpc: ec2.IVpc
  }

export class Ec2Stack extends cdk.Stack {
  public readonly hostIp: String
  constructor(scope: cdk.Construct, id: string, props: Ec2Props) {
    super(scope, id, props);

    const sg = ec2.SecurityGroup.fromSecurityGroupId(this, 'basesg', cdk.Fn.importValue('base-security-group-id'));

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
    `

    const userdata = ec2.UserData.custom(script);

    const host = new ec2.Instance(this, 'botfront-full', {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
        machineImage: ec2.MachineImage.latestAmazonLinux({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            cpuType: ec2.AmazonLinuxCpuType.X86_64
        }),
        vpc: props.baseVpc,
        vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
        keyName: 'aurora-ai',
        userData: userdata
    });

    host.addSecurityGroup(sg)
    host.connections.allowFromAnyIpv4(ec2.Port.tcp(8888));
    host.connections.allowFromAnyIpv4(ec2.Port.tcp(5005));

    new CfnOutput(this, 'ip-address', {
        value: host.instancePublicIp
    });

    this.hostIp = host.instancePublicIp;

  }
}