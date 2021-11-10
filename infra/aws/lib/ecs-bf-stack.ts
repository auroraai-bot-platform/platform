import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as s3 from '@aws-cdk/aws-s3';

import { BaseStackProps } from '../types';
import { createPrefix } from './utilities';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface EcsBfProps extends BaseStackProps {
  baseCluster: ecs.Cluster,
  baseVpc: ec2.Vpc,
  baseLoadbalancer: elbv2.ApplicationLoadBalancer,
  baseCertificate: acm.Certificate
  domain: string
  mongoSecret: secrets.Secret;
}

export class EcsBfStack extends cdk.Stack {
  public readonly botfrontService: ecs.FargateService;

  constructor(scope: cdk.Construct, id: string, props: EcsBfProps) {
    super(scope, id, props);

    const prefix = createPrefix(props.envName, this.constructor.name);
    const bfrepo = ecr.Repository.fromRepositoryName(this, `${prefix}repository-botfront`, `${props.envName}-botfront`);

    const fileBucket = new s3.Bucket(this, `${prefix}file-bucket`, { bucketName: `${prefix}file-bucket`, publicReadAccess: true });

    const botfronttd = new ecs.TaskDefinition(this, `${prefix}taskdefinition-botfront`, {
      cpu: '1024',
      memoryMiB: '4096',
      compatibility:  ecs.Compatibility.FARGATE
    });

    fileBucket.grantReadWrite(botfronttd.taskRole);
    fileBucket.grantDelete(botfronttd.taskRole);

    botfronttd.addContainer(`${prefix}container-botfront`, {
      image: ecs.ContainerImage.fromEcrRepository(bfrepo),
      containerName: 'botfront',
      portMappings: [
        {
          hostPort: 8888,
          containerPort: 8888
        }, 
        {
          hostPort: 3030,
          containerPort: 3030
        }
      ],
      environment: {
        PORT: '8888',
        REST_API_PORT: '3030',
        ROOT_URL: `https://${props.envName}.${props.domain}`,
        FILE_BUCKET: fileBucket.bucketName,
        FILE_PREFIX: 'files/',
        FILE_SIZE_LIMIT: `${1024 * 1024}`
      },
      secrets: {
        MONGO_URL: ecs.Secret.fromSecretsManager(props.mongoSecret)
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: `${prefix}botfront`,
        logRetention: RetentionDays.ONE_DAY
      }),
      essential: true,
    });

    this.botfrontService = new ecs.FargateService(this, `${prefix}service-botfront`, {
      cluster: props.baseCluster,
      taskDefinition: botfronttd,
      cloudMapOptions: {
        name: 'botfront'
      },
      serviceName: `${props.envName}-service-botfront`
    });

    const listener = new elbv2.ApplicationListener(this, `${prefix}listener-botfront`, {
      loadBalancer: props.baseLoadbalancer,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [props.baseCertificate]
    });

    const tg = new elbv2.ApplicationTargetGroup(this, `${prefix}targetgroup-botfront`, {
      targets: [this.botfrontService],
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: props.baseVpc,
      port: 8888
    });

    listener.addTargetGroups(`${prefix}targetgroupadd-botfront`, {
      targetGroups: [tg]
    });

    this.botfrontService.connections.allowFrom(props.baseLoadbalancer, ec2.Port.tcp(443));
    this.botfrontService.connections.allowFromAnyIpv4(ec2.Port.tcp(8888));
  }
}