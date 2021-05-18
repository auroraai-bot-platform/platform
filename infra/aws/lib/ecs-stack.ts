import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecsp from '@aws-cdk/aws-ecs-patterns'
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import { ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface EcsProps extends cdk.StackProps {
  baseRepo: ecr.IRepository,
  baseVpc: ec2.IVpc
}

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EcsProps) {
    super(scope, id, props);

    const dbSecret = new secrets.Secret(this, 'db-secret', {
      description: 'Password to database',
      generateSecretString: {
        excludeCharacters: ':/?#[]@ '
      }
    });

    const cluster = new ecs.Cluster(this, "baseCluster", {
      vpc: props.baseVpc
    });

    const mongoSecret = new ssm.StringParameter(this, 'mongo-secret', {
      stringValue: `mongodb://root:${dbSecret.secretValue.toString()}@127.0.0.1:27017/bf?authSource=admin`
    });

    const loadBalancer = new ApplicationLoadBalancer(this, 'botfrontlb', {
      vpc: props.baseVpc,
      internetFacing: true
    });

    const sg = ec2.SecurityGroup.fromSecurityGroupId(this, 'basesg', cdk.Fn.importValue('base-security-group-id'));

    const basetd = new ecs.TaskDefinition(this, 'basetd', {
      cpu: '2048',
      memoryMiB: '4096',
      compatibility:  ecs.Compatibility.FARGATE
    });

    basetd.addContainer('botfront', {
      image: ecs.ContainerImage.fromRegistry('botfront/botfront:v1.0.5'),
      containerName: 'botfront',
      portMappings: [{
        containerPort: 8888
      }],
      environment: {
        PORT: '8888',
        MONGO_URL: mongoSecret.stringValue,
        ROOT_URL: `http://${loadBalancer.loadBalancerDnsName}`
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'botfront',
        logRetention: RetentionDays.ONE_DAY
      }),
    });

    basetd.addContainer('mongo', {
      image: ecs.ContainerImage.fromRegistry('mongo:latest'),
      containerName: 'mongo',
      portMappings: [{
        containerPort: 27017
      }],
      environment: {
        MONGO_INITDB_ROOT_USERNAME: 'root',
        MONGO_INITDB_DATABASE: 'bf'
      },
      secrets: {
        MONGO_INITDB_ROOT_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret)
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'mongo',
        logRetention: RetentionDays.ONE_DAY
      }),
      memoryReservationMiB: 1024
    });

    basetd.addContainer('rasa', {
      image: ecs.ContainerImage.fromRegistry('botfront/rasa-for-botfront:v2.3.3-bf.3'),
      containerName: 'rasa',
      portMappings: [{
        containerPort: 5005
      }],
      environment: {
        BF_PROJECT_ID: 'bf',
        BF_URL: `http://127.0.0.1:8080/graphql`,
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'rasa',
        logRetention: RetentionDays.ONE_DAY
      })
    });

    basetd.addContainer('botfront-api', {
      image: ecs.ContainerImage.fromRegistry('botfront/botfront-api:v0.27.5'),
      containerName: 'botfront-api',
      portMappings: [{
        containerPort: 8080
      }],
      environment: {
        MONGO_URL: mongoSecret.stringValue
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'botfront-api',
        logRetention: RetentionDays.ONE_DAY
      })

    })

    basetd.addContainer('duckling', {
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


    const botfrontService = new ecsp.ApplicationLoadBalancedFargateService(this, 'botfront-service', {
      cluster,
      loadBalancer,
      taskDefinition: basetd,
      openListener: true,
      publicLoadBalancer: true,
      listenerPort: 80,
      minHealthyPercent: 0,
      maxHealthyPercent: 100
    });

    dbSecret.grantRead(botfrontService.service.taskDefinition.taskRole);
    //botfrontService.loadBalancer.addSecurityGroup(sg);

    botfrontService.service.connections.allowFromAnyIpv4(
      ec2.Port.tcp(8888), 'Inbound traffic'
    );

    dbSecret.grantRead(botfrontService.taskDefinition.taskRole);

  }
}