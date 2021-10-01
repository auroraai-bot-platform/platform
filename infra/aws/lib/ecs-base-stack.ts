import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53t from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as secret from '@aws-cdk/aws-secretsmanager';
import { createPrefix } from './utilities';
import { BaseStackProps } from '../types';

interface EcsBaseProps extends BaseStackProps {
  domain: string,
  subDomain: string,
  ecrRepos: {
    port: number;
    project: string;
    customerName: string;
  }[]
}

export class EcsBaseStack extends cdk.Stack {
  public readonly baseVpc: ec2.Vpc;
  public readonly baseCluster: ecs.Cluster;
  public readonly baseLoadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly baseCertificate: acm.Certificate;

  constructor(scope: cdk.Construct, id: string, props: EcsBaseProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);

    this.baseVpc = new ec2.Vpc(this, `${prefix}vpc`, {
      maxAzs: 2,
      natGateways: 1
    });

    const zone = route53.HostedZone.fromLookup(this, `${prefix}route53-zone`, {domainName: props.domain});
    this.baseCertificate = new acm.Certificate(this, `${prefix}acm-certificate`, {
      domainName: props.subDomain,
      validation: acm.CertificateValidation.fromDns(zone)
    });

    new ecr.Repository(this, `${prefix}ecr-repository-botfront`, {
      imageScanOnPush: true,
      repositoryName: `${props.envName}-botfront`
    });

    for (let i = 0; i < props.ecrRepos.length; i++) {
      new ecr.Repository(this, `${prefix}ecr-repository-actions-${props.ecrRepos[i].customerName}`, {
        imageScanOnPush: true,
        repositoryName: `${props.envName}-actions-${props.ecrRepos[i].customerName}`
      });
    }

    for (let i = 0; i < props.ecrRepos.length; i++) {
      new ecr.Repository(this, `${prefix}ecr-repository-rasa-${props.ecrRepos[i].customerName}`, {
        imageScanOnPush: true,
        repositoryName: `${props.envName}-rasa-${props.ecrRepos[i].customerName}`
      });
    }

    new secret.Secret(this, `${prefix}secretsmanager-secret`, {
      secretName: `dev/${props.envName}mongo/connectionstring`
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
