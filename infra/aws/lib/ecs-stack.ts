import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsp from '@aws-cdk/aws-ecs-patterns';
import * as ec2 from '@aws-cdk/aws-ec2';
import { BaseStackProps } from '../types';
import * as route53 from '@aws-cdk/aws-route53';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as servicediscovery from '@aws-cdk/aws-servicediscovery';
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

    // BOTFRONT
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

    const botfrontService = new ecsp.ApplicationLoadBalancedFargateService(this, 'botfrontservice', {
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

    // RASA
    const rasasg = new ec2.SecurityGroup(this, 'rasasg', {
      allowAllOutbound: true,
      securityGroupName: 'rasaSecurityGroup',
      vpc: props.baseVpc,
    });

    rasasg.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    const rasatd = new ecs.TaskDefinition(this, 'rasatd', {
      cpu: '1024',
      memoryMiB: '2048',
      compatibility:  ecs.Compatibility.FARGATE
    });

    rasatd.addContainer('rasa', {
      image: ecs.ContainerImage.fromRegistry('botfront/rasa-for-botfront:v2.3.3-bf.3'),
      containerName: 'rasa',
      portMappings: [{
        hostPort: 5005,
        containerPort: 5005
      }],
      environment: {
        BF_PROJECT_ID: 'hH4Z8S7GXiHsp3PTP',
        PORT: '5005',
        BF_URL: `http://botfront.${props.domain}`
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'rasa',
        logRetention: RetentionDays.ONE_DAY
      })
    });

    const rasaservice = new ecsp.ApplicationLoadBalancedFargateService(this, 'rasaservice', {
      cluster,
      taskDefinition: rasatd,
      securityGroups: [rasasg],
      cloudMapOptions: {
        cloudMapNamespace: privateZone,
        name: 'rasa'
      },
      publicLoadBalancer: true,
      domainZone: hostedZone,
      domainName: 'rasa'
    });

    /* const rasaservice = new ecs.FargateService(this, 'rasaservice', {
      cluster,
      taskDefinition: rasatd,
      securityGroups: [rasasg],
      cloudMapOptions: {
        cloudMapNamespace: privateZone,
        name: 'rasa'
      }
    });

    botfrontService.loadBalancer.addListener('rasaListener', {
      port: 5005,
      protocol: elbv2.ApplicationProtocol.HTTP
    }).addTargets('rasaTarget', {
      port: 5005,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [rasaservice.loadBalancerTarget({
        containerName: 'rasa',
        protocol: ecs.Protocol.TCP,
        containerPort: 5005
      })]
    });

    // BOTFRONT API
    const botfrontapisg = new ec2.SecurityGroup(this, 'botfrontapisg', {
      allowAllOutbound: true,
      securityGroupName: 'botfrontapiSecurityGroup',
      vpc: props.baseVpc,
    });

    botfrontapisg.connections.allowFromAnyIpv4(ec2.Port.tcp(8080));

    const botfrontapitd = new ecs.TaskDefinition(this, 'botfrontapitd', {
      cpu: '1024',
      memoryMiB: '2048',
      compatibility:  ecs.Compatibility.FARGATE
    });
    
    botfrontapitd.addContainer('botfront-api', {
      image: ecs.ContainerImage.fromRegistry('botfront/botfront-api:v0.27.5'),
      containerName: 'botfront-api',
      portMappings: [{
        hostPort: 8080,
        containerPort: 8080
      }],
      environment: {
        APPLICATION_LOG_LEVEL: 'debug',
        PORT: '8080'
      },
      secrets: {
        MONGO_URL: ecs.Secret.fromSecretsManager(mongoConnectionString)
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'botfront-api',
        logRetention: RetentionDays.ONE_DAY
      })
    });

    const botfrontapiservice = new ecs.FargateService(this, 'botfrontapiService', {
      cluster,
      taskDefinition: botfrontapitd,
      securityGroups: [botfrontapisg],
      cloudMapOptions: {
        cloudMapNamespace: privateZone,
        name: 'botfrontapi'
      }
    });

    botfrontService.loadBalancer.addListener('botfrontapiListener', {
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP
    }).addTargets('rasaTarget', {
      port: 8080,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [botfrontapiservice.loadBalancerTarget({
        containerName: 'rasa',
        protocol: ecs.Protocol.TCP,
        containerPort: 8080
      })]
    });

    // DUCKLING
    const ducklingsg = new ec2.SecurityGroup(this, 'ducklingsg', {
      allowAllOutbound: true,
      securityGroupName: 'ducklingSecurityGroup',
      vpc: props.baseVpc,
    });

    ducklingsg.connections.allowFromAnyIpv4(ec2.Port.tcp(8000));

    const ducklingtd = new ecs.TaskDefinition(this, 'ducklingtd', {
      cpu: '256',
      memoryMiB: '512',
      compatibility:  ecs.Compatibility.FARGATE
    });

    ducklingtd.addContainer('duckling', {
      image: ecs.ContainerImage.fromRegistry('botfront/duckling:latest'),
      containerName: 'duckling',
      portMappings: [{
        containerPort: 8000
      }],
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'duckling',
        logRetention: RetentionDays.ONE_DAY
      })
    });

    const ducklingservice = new ecs.FargateService(this, 'ducklingService', {
      cluster,
      taskDefinition: ducklingtd,
      securityGroups: [ducklingsg],
      cloudMapOptions: {
        cloudMapNamespace: privateZone,
        name: 'duckling'
      }
    }); */

  }
}