#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
import { EcsStack } from '../lib/ecs-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { WebChatStack } from '../lib/web-chat-stack';
const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || 'eu-north-1';
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const envName = 'demo';
const domain = 'aaibot.link';
const subDomain = `${envName}.${domain}`;
const ecsSubDomain = `ecs${envName}.${domain}`;

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack', {
  env: {
    region,
    account
  }
});

new EcsStack(app, 'EcsStack', {
  baseRepo: base.baseRepo,
  baseVpc: base.baseVpc,
  ecsSubDomain,
  domain,
  envName,
  env: {
    region,
    account
  }
});

const ec2stack = new Ec2Stack(app, 'Ec2Stack', {
  baseRepo: base.baseRepo,
  baseVpc: base.baseVpc,
  subDomain,
  domain,
  envName,
  env: {
    region,
    account
  }
});

new WebChatStack(app, 'WebChatStack', {
  envName,
  rasaIp: ec2stack.hostIp,
  domain,
  subDomain,
  env: {
    region,
    account
  }
});
