import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { BaseStackProps } from '../types';
import { createPrefix } from './utilities';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface EcsRasaProps extends BaseStackProps {
  baseCluster: ecs.ICluster,
  baseVpc: ec2.IVpc,
  baseLoadbalancer: elbv2.IApplicationLoadBalancer,
  baseCertificate: acm.ICertificate,
  botfrontService: ecs.FargateService,
  projectId: string,
  port: number
}

export class EcsRasaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EcsRasaProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);
    const rasarepo = ecr.Repository.fromRepositoryName(this, `${prefix}repository-rasa`, `${props.envName}-rasa`);
    const actionsrepo = ecr.Repository.fromRepositoryName(this, `${prefix}repository-actions`, `${props.envName}-actions`);
    const rasasg = new ec2.SecurityGroup(this, `${prefix}securitygroup-rasa`, {
      allowAllOutbound: true,
      vpc: props.baseVpc
    });

    rasasg.connections.allowFromAnyIpv4(ec2.Port.tcp(80));

    const rasatd = new ecs.TaskDefinition(this, `${prefix}taskdefinition-rasa`, {
      cpu: '2048',
      memoryMiB: '4096',
      compatibility:  ecs.Compatibility.FARGATE
    });

    rasatd.addVolume({
      name: `rasavolume${this.stackName.substr(-2)}`,
    });

    rasatd.addContainer(`${prefix}container-rasa`, {
      image: ecs.ContainerImage.fromEcrRepository(rasarepo),
      containerName: `rasa${this.stackName.substr(-2)}`,
      portMappings: [{
        hostPort: props.port,
        containerPort: props.port
      }],
      environment: {
        BF_PROJECT_ID: props.projectId,
        PORT: props.port.toString(),
        BF_URL: `http://botfront.${props.envName}service.internal:8888/graphql`
      },
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: `${prefix}rasa`,
        logRetention: RetentionDays.ONE_DAY
      })
    }).addMountPoints(
      {
        containerPath: '/app/models',
        sourceVolume: `rasavolume${this.stackName.substr(-2)}`,
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

    const rasaservice = new ecs.FargateService(this, `${prefix}service-rasa`, {
      cluster: props.baseCluster,
      taskDefinition: rasatd,
      securityGroups: [rasasg],
      cloudMapOptions: {
        name: `rasa${this.stackName.substr(-2)}`
      }
    });

    const listener = new elbv2.ApplicationListener(this, `${prefix}listener-rasa`, {
      loadBalancer: props.baseLoadbalancer,
      port: props.port,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [props.baseCertificate]
    })

    const tg = new elbv2.ApplicationTargetGroup(this, `${prefix}targetgroup-rasa`, {
      targets: [rasaservice],
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: props.baseVpc,
      port: props.port
    });

    listener.addTargetGroups(`${prefix}targetgroupadd-rasa`, {
      targetGroups: [tg]
    });

    rasaservice.connections.allowFrom(props.baseLoadbalancer, ec2.Port.tcp(props.port));
    //props.baseLoadbalancer.connections.allowTo(rasaservice, ec2.Port.tcp(props.port));
    rasaservice.connections.allowFrom(props.botfrontService, ec2.Port.tcp(props.port));
    //rasaservice.connections.allowFromAnyIpv4(ec2.Port.tcp(props.port));
    //props.botfrontService.connections.allowFrom(rasaservice, ec2.Port.tcp(8888));
  }
}