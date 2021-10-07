import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { BaseStackProps, RasaBot } from '../types';
import { createPrefix } from './utilities';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface EcsRasaProps extends BaseStackProps {
  baseCluster: ecs.ICluster,
  baseVpc: ec2.IVpc,
  baseLoadbalancer: elbv2.IApplicationLoadBalancer,
  baseCertificate: acm.ICertificate,
  botfrontService: ecs.FargateService,
  rasaBots: RasaBot[]
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
        compatibility:  ecs.Compatibility.FARGATE
      });
  
      rasatd.addVolume({
        name: `rasavolume-${rasaBot.customerName}`,
      });
  
      rasatd.addContainer(`${prefix}container-rasa-${rasaBot.customerName}`, {
        image: ecs.ContainerImage.fromEcrRepository(rasarepo),
        containerName: `rasa-${rasaBot.customerName}`,
        portMappings: [{
          hostPort: rasaBot.port,
          containerPort: rasaBot.port
        }],
        environment: {
          BF_PROJECT_ID: rasaBot.projectId,
          PORT: rasaBot.port.toString(),
          BF_URL: `http://botfront.${props.envName}service.internal:8888/graphql`
        },
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: `${prefix}rasa-${rasaBot.customerName}`,
          logRetention: RetentionDays.ONE_DAY
        })
      }).addMountPoints(
        {
          containerPath: '/app/models',
          sourceVolume: `rasavolume-${rasaBot.customerName}`,
          readOnly: false
        }
      );
  
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
  
      const rasaservice = new ecs.FargateService(this, `${prefix}service-rasa-${rasaBot.customerName}`, {
        cluster: props.baseCluster,
        taskDefinition: rasatd,
        cloudMapOptions: {
          name: `rasa-${rasaBot.customerName}`
        }
      });
  
      const listener = new elbv2.ApplicationListener(this, `${prefix}listener-rasa-${rasaBot.customerName}`, {
        loadBalancer: props.baseLoadbalancer,
        port: rasaBot.port,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        certificates: [props.baseCertificate]
      })
  
      const tg = new elbv2.ApplicationTargetGroup(this, `${prefix}targetgroup-rasa-${rasaBot.customerName}`, {
        targets: [rasaservice],
        protocol: elbv2.ApplicationProtocol.HTTP,
        vpc: props.baseVpc,
        port: rasaBot.port
      });
  
      listener.addTargetGroups(`${prefix}targetgroupadd-rasa-${rasaBot.customerName}`, {
        targetGroups: [tg]
      });
  
      rasaservice.connections.allowFrom(props.baseLoadbalancer, ec2.Port.tcp(rasaBot.port));
      //props.baseLoadbalancer.connections.allowTo(rasaservice, ec2.Port.tcp(rasaBot.port));
      rasaservice.connections.allowFrom(props.botfrontService, ec2.Port.tcp(rasaBot.port));
      //rasaservice.connections.allowFromAnyIpv4(ec2.Port.tcp(rasaBot.port));
      //props.botfrontService.connections.allowFrom(rasaservice, ec2.Port.tcp(8888));
    }
  }
}