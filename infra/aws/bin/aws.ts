#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
//import { EcsStack } from '../lib/ecs-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { WebChatStack } from '../lib/web-chat-stack';
import { CertificateStack } from '../lib/certificate-stack';

const region = 'eu-north-1';
const envName = 'demo';
const hostedZoneId = 'Z0251505KGHO1EGOLQNL';
const domain = 'aaibot.link';
const subDomain = `${envName}.${domain}`;

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack');

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
  hostedZoneId,
  envName
});

new WebChatStack(app, 'WebChatStack', {
  envName,
  rasaIp: ec2stack.hostIp,
  env: {
    region
  }
});
