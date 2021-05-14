import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecsp from '@aws-cdk/aws-ecs-patterns'
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import { ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface ApplicationProps extends cdk.StackProps {
  baseRepo: ecr.IRepository,
  baseVpc: ec2.IVpc
}

export class ApplicationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ApplicationProps) {
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

    cluster.addDefaultCloudMapNamespace({
      name: 'ai.local',
      vpc: props.baseVpc
    });

    const mongoSecret = new ssm.StringParameter(this, 'mongo-secret', {
      stringValue: `mongodb://root:${dbSecret.secretValue.toString()}@mongo.ai.local:27017/bf?authSource=admin`
    });

    const lb = new ApplicationLoadBalancer(this, 'botfrontlb', {
      vpc: props.baseVpc,
      internetFacing: true
    })

    const sg = ec2.SecurityGroup.fromSecurityGroupId(this, 'basesg', cdk.Fn.importValue('base-security-group-id'));

    const mongotd = new ecs.TaskDefinition(this, 'mongotd', {
      cpu: '256',
      memoryMiB: '512',
      compatibility:  ecs.Compatibility.FARGATE
    });

    mongotd.addContainer('mongocontainer', {
      image: ecs.ContainerImage.fromRegistry('mongo:latest'),
      containerName: 'botfront-mongo',
      portMappings: [{
        containerPort: 27017,
        hostPort: 27017
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
      })
    });

    const mongoService = new ecs.FargateService(this, 'mongo-service', {
      cluster,
      cloudMapOptions: {
        name: 'mongo',
      },
      taskDefinition: mongotd
    });

    const botfrontService = new ecsp.ApplicationLoadBalancedFargateService(this, 'botfront-service', {
      cluster,
      loadBalancer: lb,
      memoryLimitMiB: 2048,
      cpu: 512,
      openListener: false,
      cloudMapOptions: {
        name: 'botfront',
      },
      listenerPort: 80,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('botfront/botfront:v1.0.5'),
        containerName: 'botfront-app',
        containerPort: 3000,
        environment: {
          PORT: '3000',
          MONGO_URL: mongoSecret.stringValue,
          BF_PROJECT_ID: 'bf',
          BF_URL: 'http://botfront.ai.local:3000/graphql',
          ROOT_URL: `http://${lb.loadBalancerDnsName}`
        }
      }
    });

    mongoService.connections.allowFrom(
      botfrontService.service, 
      ec2.Port.tcp(27017)
    );

    dbSecret.grantRead(botfrontService.service.taskDefinition.taskRole);
    botfrontService.loadBalancer.addSecurityGroup(sg);

    botfrontService.service.connections.allowFromAnyIpv4(
      ec2.Port.tcp(8888), 'Inbound traffic'
    );

    dbSecret.grantRead(mongoService.taskDefinition.taskRole);

  }
}