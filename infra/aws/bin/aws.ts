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

const hyteEcsEnvName = 'hyte-ecs';
const hyteEcsSubDomain = `${hyteEcsEnvName}.${domain}`;
const hyteWebChatSubDomain = `chat.${hyteEcsSubDomain}`;
const hyteEcsrasaBots = [{port: 5005, project: 'HFqcqN9LEiDo8u2N7'}]

const demoEcsEnvName = 'demo-ecs';
const demoEcsSubDomain = `${demoEcsEnvName}.${domain}`;
const demoWebChatSubDomain = `chat.${demoEcsSubDomain}`;
const demoEcsrasaBots = [{port: 5005, project: 'hH4Z8S7GXiHsp3PTP'}]

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
const demoEcsBaseStack = new EcsBaseStack(app, 'DemoEcsBaseStack', {
  envName: demoEcsEnvName,
  subDomain: demoEcsSubDomain,
  domain,
  env: {
    region,
    account
  }
});
cdk.Tags.of(demoEcsBaseStack).add('environment', demoEcsEnvName)

const demoEcsBfStack = new EcsBfStack(app, 'DemoEcsBfStack', {
  envName: demoEcsEnvName,
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
cdk.Tags.of(demoEcsBfStack).add('environment', demoEcsEnvName)

let stack;
for (let i = 0; i < demoEcsrasaBots.length; i++) {
  stack = new EcsRasaStack(app, `DemoEcsRasaStack-${i}`, {
    envName: demoEcsEnvName,
    baseCluster: demoEcsBaseStack.baseCluster,
    baseVpc: demoEcsBaseStack.baseVpc,
    baseLoadbalancer: demoEcsBaseStack.baseLoadBalancer,
    baseCertificate: demoEcsBaseStack.baseCertificate,
    botfrontService: demoEcsBfStack.botfrontService,
    port: demoEcsrasaBots[i].port,
    projectId: demoEcsrasaBots[i].project,
    env: {
      region,
      account
    }
  });
  cdk.Tags.of(stack).add('environment', demoEcsEnvName)
  
}

// Hyte ecs env
const hyteEcsBaseStack = new EcsBaseStack(app, 'HyteEcsBaseStack', {
  envName: hyteEcsEnvName,
  subDomain: hyteEcsSubDomain,
  domain,
  env: {
    region,
    account
  }
});
cdk.Tags.of(hyteEcsBaseStack).add('environment', hyteEcsEnvName)

const hyteEcsBfStack = new EcsBfStack(app, 'HyteEcsBfStack', {
  envName: hyteEcsEnvName,
  baseCluster: hyteEcsBaseStack.baseCluster,
  baseCertificate: hyteEcsBaseStack.baseCertificate,
  baseLoadbalancer: hyteEcsBaseStack.baseLoadBalancer,
  baseVpc: hyteEcsBaseStack.baseVpc,
  domain,
  env: {
    region,
    account
  }
});
cdk.Tags.of(hyteEcsBfStack).add('environment', hyteEcsEnvName)

for (let i = 0; i < hyteEcsrasaBots.length; i++) {
  stack = new EcsRasaStack(app, `HyteEcsRasaStack-${i}`, {
    envName: hyteEcsEnvName,
    baseCluster: hyteEcsBaseStack.baseCluster,
    baseVpc: hyteEcsBaseStack.baseVpc,
    baseLoadbalancer: hyteEcsBaseStack.baseLoadBalancer,
    baseCertificate: hyteEcsBaseStack.baseCertificate,
    botfrontService: hyteEcsBfStack.botfrontService,
    port: hyteEcsrasaBots[i].port,
    projectId: hyteEcsrasaBots[i].project,
    env: {
      region,
      account
    }
  });
  cdk.Tags.of(stack).add('environment', hyteEcsEnvName)
  
}