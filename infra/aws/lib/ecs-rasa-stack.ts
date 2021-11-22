import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { BaseStackProps, RasaBot } from '../types';
import { createPrefix } from './utilities';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Secret } from '@aws-cdk/aws-secretsmanager';

interface EcsRasaProps extends BaseStackProps {
  baseCluster: ecs.ICluster,
  baseVpc: ec2.IVpc,
  baseLoadbalancer: elbv2.IApplicationLoadBalancer,
  baseCertificate: acm.ICertificate,
  botfrontService: ecs.FargateService,
  rasaBots: RasaBot[],
  graphqlSecret: Secret
}

export class EcsRasaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EcsRasaProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);

    for (const rasaBot of props.rasaBots) {
      const rasarepo = ecr.Repository.fromRepositoryName(this, `${prefix}repository-rasa-${rasaBot.customerName}`, `${props.envName}-rasa-${rasaBot.customerName}`);
      const actionsrepo = ecr.Repository.fromRepositoryName(this, `${prefix}repository-actions-${rasaBot.customerName}`, `${props.envName}-actions-${rasaBot.customerName}`);

      const rasatd = new ecs.TaskDefinition(this, `${prefix}taskdefinition-rasa-${rasaBot.customerName}`, {
        cpu: '2048',
        memoryMiB: '4096',
        compatibility: ecs.Compatibility.FARGATE
      });

      const actionstd = new ecs.TaskDefinition(this, `${prefix}taskdefinition-actions-${rasaBot.customerName}`, {
        cpu: '256',
        memoryMiB: '512',
        compatibility: ecs.Compatibility.FARGATE
      });

      rasatd.addVolume({
        name: `rasavolume-${rasaBot.customerName}`,
      });

      rasatd.addContainer(`${prefix}container-rasa-${rasaBot.customerName}`, {
        image: ecs.ContainerImage.fromEcrRepository(rasarepo),
        containerName: `rasa-${rasaBot.customerName}`,
        portMappings: [{
          hostPort: rasaBot.rasaPort,
          containerPort: rasaBot.rasaPort
        }],
        command: ["rasa", "run", "--enable-api", "--debug",  "--port", rasaBot.rasaPort.toString(), "--auth-token", props.graphqlSecret.secretValue.toString()],
        environment: {
          BF_PROJECT_ID: rasaBot.projectId,
          PORT: rasaBot.rasaPort.toString(),
          BF_URL: `http://botfront.${props.envName}service.internal:8888/graphql`
        },
        secrets: {
          API_KEY: ecs.Secret.fromSecretsManager(props.graphqlSecret)
        },
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: `${prefix}container-rasa-${rasaBot.customerName}`,
          logRetention: RetentionDays.ONE_DAY
        })
      }).addMountPoints(
        {
          containerPath: '/app/models',
          sourceVolume: `rasavolume-${rasaBot.customerName}`,
          readOnly: false
        }
      );

      actionstd.addContainer(`${prefix}actions`, {
        image: ecs.ContainerImage.fromEcrRepository(actionsrepo),
        containerName: `actions-${rasaBot.customerName}`,
        portMappings: [{
          hostPort: rasaBot.actionsPort,
          containerPort: rasaBot.actionsPort
        }],
        command: ["start", "--actions", "actions", "--debug", "--port", rasaBot.actionsPort.toString()],
        environment: {
          PORT: rasaBot.actionsPort.toString(),
          BF_URL: `http://botfront.${props.envName}service.internal:8888/graphql`
        },
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: `${prefix}actions-${rasaBot.customerName}`,
          logRetention: RetentionDays.ONE_DAY
        })
      });

      const rasaservice = new ecs.FargateService(this, `${prefix}service-rasa-${rasaBot.customerName}`, {
        cluster: props.baseCluster,
        taskDefinition: rasatd,
        cloudMapOptions: {
          name: `rasa-${rasaBot.customerName}`
        },
        serviceName: `${props.envName}-service-rasa-${rasaBot.customerName}`
      });

      const actionsservice = new ecs.FargateService(this, `${prefix}service-actions-${rasaBot.customerName}`, {
        cluster: props.baseCluster,
        taskDefinition: actionstd,
        cloudMapOptions: {
          name: `actions-${rasaBot.customerName}`
        },
        serviceName: `${props.envName}-service-actions-${rasaBot.customerName}`
      });

      const rasalistener = new elbv2.ApplicationListener(this, `${prefix}listener-rasa-${rasaBot.customerName}`, {
        loadBalancer: props.baseLoadbalancer,
        port: rasaBot.rasaPort,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [props.baseCertificate]
      })

      const actionslistener = new elbv2.ApplicationListener(this, `${prefix}listener-actions-${rasaBot.customerName}`, {
        loadBalancer: props.baseLoadbalancer,
        port: rasaBot.actionsPort,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [props.baseCertificate]
      })

      const rasatg = new elbv2.ApplicationTargetGroup(this, `${prefix}targetgroup-rasa-${rasaBot.customerName}`, {
        targets: [rasaservice],
        protocol: elbv2.ApplicationProtocol.HTTP,
        vpc: props.baseVpc,
        port: rasaBot.rasaPort
      });

      const actionstg = new elbv2.ApplicationTargetGroup(this, `${prefix}targetgroup-actions-${rasaBot.customerName}`, {
        targets: [actionsservice],
        protocol: elbv2.ApplicationProtocol.HTTP,
        vpc: props.baseVpc,
        port: rasaBot.actionsPort,
        healthCheck: {
          path: "/actions"
        }
      });

      rasalistener.addTargetGroups(`${prefix}targetgroupadd-rasa-${rasaBot.customerName}`, {
        targetGroups: [rasatg],
        priority: 1,
        conditions: [
          elbv2.ListenerCondition.pathPatterns(['/socket.io', '/socket.io/*'])
        ]
      });

      rasalistener.addAction(`${prefix}blockdefault-rasa-${rasaBot.customerName}`, {
        action: elbv2.ListenerAction.fixedResponse(403)
      });

      actionslistener.addTargetGroups(`${prefix}targetgroupadd-actions-${rasaBot.customerName}`, {
        targetGroups: [actionstg]

      });

      rasaservice.connections.allowFrom(props.baseLoadbalancer, ec2.Port.tcp(rasaBot.rasaPort));
      rasaservice.connections.allowFrom(props.botfrontService, ec2.Port.tcp(rasaBot.rasaPort));
      rasaservice.connections.allowFrom(props.botfrontService, ec2.Port.tcp(rasaBot.actionsPort));

      actionsservice.connections.allowFrom(props.botfrontService, ec2.Port.tcp(rasaBot.actionsPort));
      actionsservice.connections.allowFrom(rasaservice, ec2.Port.tcp(rasaBot.actionsPort));
    }
  }
}
