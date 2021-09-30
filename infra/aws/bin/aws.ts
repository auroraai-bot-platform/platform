#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { EcsBaseStack } from '../lib/ecs-base-stack';
import { WebChatStack } from '../lib/web-chat-stack';
import { EcsBfStack } from '../lib/ecs-bf-stack';
import { EcsRasaStack } from '../lib/ecs-rasa-stack';
const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || 'eu-north-1';
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

// Base domain
const domain = 'aaibot.link';

// Environments
const hyteEnvName = 'hyte';
const hyteSubDomain = `${hyteEnvName}.${domain}`;

const customerEnvName = 'customer';
const customerSubDomain = `${customerEnvName}.${domain}`;
const customerWebChatSubDomain = `chat.${customerSubDomain}`;
const customerRasaBots = [{port: 5005, project: 'HFqcqN9LEiDo8u2N7', customerName: 'hyte'}];

const demoEnvName = 'demo';
const demoSubDomain = `${demoEnvName}.${domain}`;
const demoWebChatSubDomain = `chat.${demoSubDomain}`;
const demoRasaBots = [{port: 5005, project: 'hH4Z8S7GXiHsp3PTP', customerName: 'demo-1'}];

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack', {
  env: {
    region,
    account
  }
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

// Demo-ecs env
const demoEcsBaseStack = new EcsBaseStack(app, 'DemoBaseStack', {
  envName: demoEnvName,
  ecrRepos: demoRasaBots,
  subDomain: demoSubDomain,
  domain,
  env: {
    region,
    account
  }
});
cdk.Tags.of(demoEcsBaseStack).add('environment', demoEnvName)

const demoEcsBfStack = new EcsBfStack(app, 'DemoBfStack', {
  envName: demoEnvName,
  baseCluster: demoEcsBaseStack.baseCluster,
  baseCertificate: demoEcsBaseStack.baseCertificate,
  baseLoadbalancer: demoEcsBaseStack.baseLoadBalancer,
  baseVpc: demoEcsBaseStack.baseVpc,
  domain,
  env: {
    region,
    account
  }
});
cdk.Tags.of(demoEcsBfStack).add('environment', demoEnvName)

let stack;
for (let i = 0; i < demoRasaBots.length; i++) {
  stack = new EcsRasaStack(app, `DemoRasaStack-${i}`, {
    envName: demoEnvName,
    baseCluster: demoEcsBaseStack.baseCluster,
    baseVpc: demoEcsBaseStack.baseVpc,
    baseLoadbalancer: demoEcsBaseStack.baseLoadBalancer,
    baseCertificate: demoEcsBaseStack.baseCertificate,
    botfrontService: demoEcsBfStack.botfrontService,
    port: demoRasaBots[i].port,
    projectId: demoRasaBots[i].project,
    customerName: demoRasaBots[i].customerName,
    env: {
      region,
      account
    }
  });
  cdk.Tags.of(stack).add('environment', demoEnvName)
  
}

// customer ecs env
const customerBaseStack = new EcsBaseStack(app, 'CustomerBaseStack', {
  envName: customerEnvName,
  subDomain: customerSubDomain,
  ecrRepos: customerRasaBots,
  domain,
  env: {
    region,
    account
  }
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
  }
});
cdk.Tags.of(customerBfStack).add('environment', customerEnvName)

for (let i = 0; i < customerRasaBots.length; i++) {
  stack = new EcsRasaStack(app, `${customerRasaBots[i].customerName}RasaStack-${i}`, {
    envName: customerRasaBots[i].customerName,
    baseCluster: customerBaseStack.baseCluster,
    baseVpc: customerBaseStack.baseVpc,
    baseLoadbalancer: customerBaseStack.baseLoadBalancer,
    baseCertificate: customerBaseStack.baseCertificate,
    botfrontService: customerBfStack.botfrontService,
    port: customerRasaBots[i].port,
    projectId: customerRasaBots[i].project,
    customerName: customerRasaBots[i].customerName,
    env: {
      region,
      account
    }
  });
  cdk.Tags.of(stack).add('environment', customerRasaBots[i].customerName)
  
}