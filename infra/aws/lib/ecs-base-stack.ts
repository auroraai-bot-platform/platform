import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53t from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as secrets from '@aws-cdk/aws-secretsmanager';

import * as ecrdeploy from 'cdk-ecr-deployment';

import { createPrefix } from './utilities';
import { BaseStackProps, RasaBot } from '../types';
import { DefaultRepositories } from '../envs/environment';

interface EcsBaseProps extends BaseStackProps {
  defaultRepositories: DefaultRepositories;
  domain: string;
  subDomain: string;
  ecrRepos: RasaBot[];
}

export class EcsBaseStack extends cdk.Stack {
  public readonly baseVpc: ec2.Vpc;
  public readonly baseCluster: ecs.Cluster;
  public readonly baseLoadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly baseCertificate: acm.Certificate;
  public readonly mongoSecret: secrets.Secret;
  public readonly graphqlSecret: secrets.Secret;

  constructor(scope: cdk.Construct, id: string, props: EcsBaseProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);

    this.baseVpc = new ec2.Vpc(this, `${prefix}vpc`, {
      maxAzs: 2,
      natGateways: 1
    });

    this.baseVpc.addGatewayEndpoint(`${prefix}vpc-endpoint-s3`, {
      service: ec2.GatewayVpcEndpointAwsService.S3
    });

    this.baseVpc.addInterfaceEndpoint(`${prefix}vpc-endpoint-ecr`, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR
    });

    this.baseVpc.addInterfaceEndpoint(`${prefix}vpc-endpoint-ecr-dkr`, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER
    });

    this.baseVpc.addInterfaceEndpoint(`${prefix}vpc-endpoint-cloudwatch`, {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS
    });

    const zone = route53.HostedZone.fromLookup(this, `${prefix}route53-zone`, {domainName: props.domain});
    this.baseCertificate = new acm.Certificate(this, `${prefix}acm-certificate`, {
      domainName: props.subDomain,
      validation: acm.CertificateValidation.fromDns(zone)
    });

    const bfRepo = new ecr.Repository(this, `${prefix}ecr-repository-botfront`, {
      imageScanOnPush: true,
      repositoryName: `${props.envName}-botfront`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ecrdeploy.ECRDeployment(this, `${prefix}deploy-bf-image`, {
      src: new ecrdeploy.DockerImageName(props.defaultRepositories.botfrontRepository),
      dest: new ecrdeploy.DockerImageName(`${bfRepo.repositoryUri}:latest`),
    });


    for (const ecrRepoConfig of props.ecrRepos) {
      const rasaRepo = new ecr.Repository(this, `${prefix}ecr-repository-rasa-${ecrRepoConfig.customerName}`, {
        imageScanOnPush: true,
        repositoryName: `${props.envName}-rasa-${ecrRepoConfig.customerName}`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      new ecrdeploy.ECRDeployment(this, `${prefix}deploy-rasa-image-${ecrRepoConfig.customerName}`, {
        src: new ecrdeploy.DockerImageName(props.defaultRepositories.rasaBotRepository),
        dest: new ecrdeploy.DockerImageName(`${rasaRepo.repositoryUri}:latest`),
      });

      const actionsRepo = new ecr.Repository(this, `${prefix}ecr-repository-actions-${ecrRepoConfig.customerName}`, {
        imageScanOnPush: true,
        repositoryName: `${props.envName}-actions-${ecrRepoConfig.customerName}`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      new ecrdeploy.ECRDeployment(this, `${prefix}deploy-actions-image-${ecrRepoConfig.customerName}`, {
        src: new ecrdeploy.DockerImageName(props.defaultRepositories.actionsRepository),
        dest: new ecrdeploy.DockerImageName(`${actionsRepo.repositoryUri}:latest`),
      });
    }


    const mongoSecretName = `${prefix}mongo-connectionstring`;
    const graphqlSecretName = `${prefix}graphql-apikey`;

    this.mongoSecret = new secrets.Secret(this, mongoSecretName, {
      secretName: mongoSecretName
    });

    this.graphqlSecret = new secrets.Secret(this, graphqlSecretName, {
      secretName: graphqlSecretName,
      generateSecretString: {
        excludePunctuation: true
      }
    });

    this.baseCluster = new ecs.Cluster(this, `${prefix}ecs-cluster`, {
      vpc: this.baseVpc,
      clusterName: `${props.envName}-cluster`,
      containerInsights: true,
      defaultCloudMapNamespace: {
        name: `${props.envName}service.internal`,
        vpc: this.baseVpc
      }
    });

    this.baseLoadBalancer = new elbv2.ApplicationLoadBalancer(this, `${prefix}alb-base`, {
      vpc: this.baseVpc,
      internetFacing: true
    });

    new route53.ARecord(this, `${prefix}route53-record-a`, {
      zone,
      target: route53.RecordTarget.fromAlias(new route53t.LoadBalancerTarget(this.baseLoadBalancer)),
      recordName: props.envName
    });
  }
}
