#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { EcsBaseStack } from '../lib/ecs-base-stack';
import { WebChatStack } from '../lib/web-chat-stack';
import { EcsBfStack } from '../lib/ecs-bf-stack';
import { EcsRasaStack } from '../lib/ecs-rasa-stack';
import { RasaBot } from '../types';
import { createEnvironment, DefaultRepositories } from '../envs/environment';


const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || 'eu-north-1';
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || '';

const defaultRepositories: DefaultRepositories = {
  actionsRepository: '530123621479.dkr.ecr.eu-north-1.amazonaws.com/actions-private:latest',
  botfrontRepository: '530123621479.dkr.ecr.eu-north-1.amazonaws.com/botfront-private:latest',
  rasaBotRepository: '530123621479.dkr.ecr.eu-north-1.amazonaws.com/rasa-private:latest',
};

console.log({account});

// Base domain
const domain = 'aaibot.link';

// Environments
// RasaBots customerName must be unique!
const hyteEnvName = 'hyte';
const hyteSubDomain = `${hyteEnvName}.${domain}`;

const customerEnvName = 'customer';
const customerSubDomain = `${customerEnvName}.${domain}`;
const customerWebChatSubDomain = `chat.${customerSubDomain}`;
const customerRasaBots: RasaBot[] = [{rasaPort: 5005, actionsPort: 5055, projectId: 'HFqcqN9LEiDo8u2N7', customerName: 'hyte-firstbot'}];

const demoEnvName = 'demo';
const demoSubDomain = `${demoEnvName}.${domain}`;
const demoWebChatSubDomain = `chat.${demoSubDomain}`;
const demoRasaBots: RasaBot[] = [{rasaPort: 5006, actionsPort: 5055, projectId: 'hH4Z8S7GXiHsp3PTP', customerName: 'demo-1'}];

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack', {
  env: {
    region,
    account
  }
});

const env = createEnvironment(app, {
  domain,
  defaultRepositories,
  env: {account, region},
  envName: demoEnvName,
  rasaBots: demoRasaBots,
  subDomain: demoSubDomain
});

// Hyte env
// Destroy this when hyte-ecs is ok
const hyteStack = new Ec2Stack(app, 'HyteStack', {
  baseVpc: base.baseVpc,
  subDomain: hyteSubDomain,
  domain,
  envName: hyteEnvName,
  env: {
    region,
    account
  }
});

// Destroy this when hyte-ecs is ok
new WebChatStack(app, 'HyteWebChatStack', {
  envName: hyteEnvName,
  rasaIp: hyteStack.hostIp,
  domain,
  subDomain: hyteSubDomain,
  env: {
    region,
    account
  }
});



// customer ecs env
const customerBaseStack = new EcsBaseStack(app, 'CustomerBaseStack', {
  envName: customerEnvName,
  subDomain: customerSubDomain,
  ecrRepos: customerRasaBots,
  domain,
  env: {
    region,
    account
  },
  defaultRepositories
});
cdk.Tags.of(customerBaseStack).add('environment', customerEnvName)

const customerBfStack = new EcsBfStack(app, 'CustomerBfStack', {
  envName: customerEnvName,
  baseCluster: customerBaseStack.baseCluster,
  baseCertificate: customerBaseStack.baseCertificate,
  baseLoadbalancer: customerBaseStack.baseLoadBalancer,
  baseVpc: customerBaseStack.baseVpc,
  domain,
  env: {
    region,
    account
  },
  mongoSecret: customerBaseStack.mongoSecret
});

cdk.Tags.of(customerBfStack).add('environment', customerEnvName)

const customerRasaBotStack = new EcsRasaStack(app, `CustomerRasaStack`, {
  envName: customerEnvName,
  baseCluster: customerBaseStack.baseCluster,
  baseVpc: customerBaseStack.baseVpc,
  baseLoadbalancer: customerBaseStack.baseLoadBalancer,
  baseCertificate: customerBaseStack.baseCertificate,
  botfrontService: customerBfStack.botfrontService,
  rasaBots: customerRasaBots,
  env: {
    region,
    account
  }
});

