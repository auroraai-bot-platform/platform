#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
//import { EcsStack } from '../lib/ecs-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { WebChatStack } from '../lib/web-chat-stack';
import { CertificateStack } from '../lib/certificate-stack';

const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || 'eu-north-1';
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const envName = 'demo';
const hostedZoneId = 'Z0251505KGHO1EGOLQNL';
const domain = 'aaibot.link';
const subDomain = `${envName}.${domain}`;

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack', {
  env: {
    region,
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
});

const certificateStack = new CertificateStack(app, 'CertificateStack', {
  subDomain,
  hostedZoneId,
  envName
});

/** 
 * This doesn't work yet since the setup is difficult 
 * in separated environment */ 
/* new EcsStack(app, 'EcsStack', {
  baseRepo: base.baseRepo,
  baseVpc: base.baseVpc
}); */
export const ec2stack = new Ec2Stack(app, 'Ec2Stack', {
  baseRepo: base.baseRepo,
  baseVpc: base.baseVpc,
  subDomain,
  domain,
  hostedZoneId,
  envName,
  env: {
    region,
    account: process.env.CDK_DEFAULT_ACCOUNT
  }
});

new WebChatStack(app, 'WebChatStack', {
  envName,
  rasaIp: ec2stack.hostIp,
  env: {
    region
  }
});
