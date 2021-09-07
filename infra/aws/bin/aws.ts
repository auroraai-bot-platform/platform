#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
import { EcsStack } from '../lib/ecs-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { WebChatStack } from '../lib/web-chat-stack';
const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || 'eu-north-1';
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

// Base domain
const domain = 'aaibot.link';

// Environments
const envName = 'demo';
const subDomain = `${envName}.${domain}`;

const hyteEnvName = 'hyte';
const hyteSubDomain = `${hyteEnvName}.${domain}`;

const ecsEnvName = 'ecs'
const ecsSubDomain = `${ecsEnvName}.${domain}`;

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack', {
  env: {
    region,
    account
  }
});

// Demo env
const ec2stack = new Ec2Stack(app, 'Ec2Stack', {
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

// Hyte env
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

new EcsStack(app, 'EcsStack', {
  envName: ecsEnvName,
  baseVpc: base.baseVpc,
  ecsSubDomain,
  domain,
  env: {
    region,
    account
  }
});