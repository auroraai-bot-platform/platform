#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
//import { EcsStack } from '../lib/ecs-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { WebChatStack } from '../lib/web-chat-stack';

const region = 'eu-north-1';
const envName = 'demo';

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack');
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
  envName
});

new WebChatStack(app, 'WebChatStack', {
  envName,
  rasaIp: ec2stack.hostIp,
  env: {
    region
  }
});
