#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
//import { EcsStack } from '../lib/ecs-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { WebChatStack } from '../lib/web-chat-stack';
const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || 'eu-north-1';
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

// Base domain
const domain = 'aaibot.link';

// Environments
const envName = 'demo';
const subDomain = `${envName}.${domain}`;
const demoPorts = {'botfront': 8888, 'rasa': 5005, 'actions': 5055}

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack', {
  env: {
    region,
    account
  }
});


const ec2stack = new Ec2Stack(app, 'Ec2Stack', {
  baseAlb: base.baseAlb,
  baseVpc: base.baseVpc,
  ports: demoPorts,
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
