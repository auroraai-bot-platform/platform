import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsp from '@aws-cdk/aws-ecs-patterns';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import { BaseStackProps } from '../types';
import * as route53 from '@aws-cdk/aws-route53';
import * as r53t from '@aws-cdk/aws-route53-targets';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as servicediscovery from '@aws-cdk/aws-servicediscovery';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface EcsProps extends BaseStackProps {
  baseRepo: ecr.IRepository,
  baseVpc: ec2.IVpc,
  ecsSubDomain: string,
  domain: string
}

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EcsProps) {
    super(scope, id, props);

    const mongoConnectionString = secrets.Secret.fromSecretNameV2(this, 'db-secret', 'botfront/mongo/connectionstring');

    const repo = ecr.Repository.fromRepositoryName(this, 'ecrrepo', 'aurora-bot-images');

    const sg = ec2.SecurityGroup.fromSecurityGroupId(this, 'basesg', cdk.Fn.importValue('base-security-group-id'));

    const hostedZone = route53.HostedZone.fromLookup(this, 'hostedZone', {domainName: props.domain});

    const privateZone = new servicediscovery.PrivateDnsNamespace(this, 'internalZone', {
      name: 'service.internal',
      vpc: props.baseVpc
    });

    const cluster = new ecs.Cluster(this, "baseCluster", {
      vpc: props.baseVpc
    });

    const botfronttd = new ecs.TaskDefinition(this, 'botfronttd', {
      cpu: '1024',
      memoryMiB: '2048',
      compatibility:  ecs.Compatibility.FARGATE
    });

    botfronttd.addContainer('botfront', {
      image: ecs.ContainerImage.fromRegistry('botfront/botfront:v1.0.5'),
      containerName: 'botfront',
      portMappings: [{
        hostPort: 8888,
        containerPort: 8888
      }],
      environment: {
        PORT: '8888',
        APPLICATION_LOG_LEVEL: 'debug',
        ROOT_URL: `http://botfront.${props.domain}`
      },
      secrets: {
        MONGO_URL: ecs.Secret.fromSecretsManager(mongoConnectionString)
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'botfront',
        logRetention: RetentionDays.ONE_DAY
      }),
      essential: true,
    });

    const botfrontsg = new ec2.SecurityGroup(this, 'botfrontsg', {
      allowAllOutbound: true,
      securityGroupName: 'botfrontSecurityGroup',
      vpc: props.baseVpc,
    });

    botfrontsg.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    const botfrontService = new ecsp.ApplicationLoadBalancedFargateService(this, 'botfront-service', {
      cluster,
      taskDefinition: botfronttd,
      securityGroups: [botfrontsg],
      cloudMapOptions: {
        cloudMapNamespace: privateZone,
        name: 'botfront'
      },
      publicLoadBalancer: true,
      domainZone: hostedZone,
      domainName: 'botfront'
    });

    


  }
}