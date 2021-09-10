import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsp from '@aws-cdk/aws-ecs-patterns';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ec2 from '@aws-cdk/aws-ec2';
import { BaseStackProps } from '../types';
import { createPrefix } from './utilities';
import * as route53 from '@aws-cdk/aws-route53';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as servicediscovery from '@aws-cdk/aws-servicediscovery';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface EcsProps extends BaseStackProps {
  baseVpc: ec2.IVpc,
  ecsSubDomain: string,
  domain: string
}

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EcsProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);

    const mongoConnectionString = secrets.Secret.fromSecretNameV2(this, `${prefix}db-secret`, 'botfront/mongo/connectionstring');

    const rasaRepo = ecr.Repository.fromRepositoryName(this, `${prefix}rasaRepo`, 'rasa-private');
    const botfrontRepo = ecr.Repository.fromRepositoryName(this, 'botfrontRepo', 'botfront-private');
    const actionsRepo = ecr.Repository.fromRepositoryName(this, 'actionsRepo', 'actions-private');

    const sg = ec2.SecurityGroup.fromSecurityGroupId(this, `${prefix}basesg`, cdk.Fn.importValue('base-security-group-id'));

    const hostedZone = route53.HostedZone.fromLookup(this, `${prefix}hostedZone`, {domainName: props.domain});

    const privateZone = new servicediscovery.PrivateDnsNamespace(this, `${prefix}internalZone`, {
      name: 'service.internal',
      vpc: props.baseVpc
    });

    const cluster = new ecs.Cluster(this, `${prefix}baseCluster`, {
      vpc: props.baseVpc,
      containerInsights: true
    });

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, `${prefix}loadbalancer`, {
      vpc: props.baseVpc,
      internetFacing: true
    })

    // BOTFRONT
    const botfronttd = new ecs.TaskDefinition(this, `${prefix}botfronttd`, {
      cpu: '1024',
      memoryMiB: '2048',
      compatibility:  ecs.Compatibility.FARGATE
    });

    botfronttd.addContainer(`${prefix}botfront`, {
      image: ecs.ContainerImage.fromEcrRepository(botfrontRepo),
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

    const botfrontsg = new ec2.SecurityGroup(this, `${prefix}botfrontsg`, {
      allowAllOutbound: true,
      securityGroupName: 'botfrontSecurityGroup',
      vpc: props.baseVpc,
    });

    botfrontsg.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    const botfrontService = new ecsp.ApplicationLoadBalancedFargateService(this, `${prefix}botfrontservice`, {
      cluster,
      taskDefinition: botfronttd,
      securityGroups: [botfrontsg],
      cloudMapOptions: {
        cloudMapNamespace: privateZone,
        name: `${prefix}botfront`
      },
      listenerPort: 80,
      loadBalancer,
      domainZone: hostedZone,
      domainName: prefix
    });

    // RASA
    const rasasg = new ec2.SecurityGroup(this, `${prefix}rasasg`, {
      allowAllOutbound: true,
      securityGroupName: 'rasaSecurityGroup',
      vpc: props.baseVpc,
    });

    rasasg.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    const rasatd = new ecs.TaskDefinition(this, `${prefix}rasatd`, {
      cpu: '1024',
      memoryMiB: '2048',
      compatibility:  ecs.Compatibility.FARGATE
    });

    rasatd.addContainer(`${prefix}rasa`, {
      image: ecs.ContainerImage.fromEcrRepository(rasaRepo),
      containerName: 'rasa',
      portMappings: [{
        hostPort: 5005,
        containerPort: 5005
      }],
      environment: {
        BF_PROJECT_ID: 'hH4Z8S7GXiHsp3PTP',
        PORT: '5005',
        BF_URL: `http://${prefix}botfront.service.internal:8888/graphql`
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'rasa',
        logRetention: RetentionDays.ONE_DAY
      })
    });

/*     rasatd.addContainer(`${prefix}actions`, {
      image: ecs.ContainerImage.fromEcrRepository(actionsRepo),
      containerName: 'actions',
      portMappings: [{
        hostPort: 5055,
        containerPort: 5055
      }],
      environment: {
        PORT: '5055',
        BF_URL: `http://botfront.service.internal:8888/graphql`
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'actions',
        logRetention: RetentionDays.ONE_DAY
      })
    }); */

    const rasaservice = new ecsp.ApplicationLoadBalancedFargateService(this, `${prefix}rasaservice`, {
      cluster,
      taskDefinition: rasatd,
      securityGroups: [rasasg],
      cloudMapOptions: {
        cloudMapNamespace: privateZone,
        name: `${prefix}rasa`
      },
      listenerPort: 5005,
      loadBalancer,
      publicLoadBalancer: true,
      domainZone: hostedZone,
      domainName: prefix
    });

    rasaservice.service.connections.allowFrom(botfrontService.service, ec2.Port.tcp(5005));
    botfrontService.service.connections.allowFrom(rasaservice.service, ec2.Port.tcp(8888));

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