#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
//import { EcsStack } from '../lib/ecs-stack';
import { Ec2Stack } from '../lib/ec2-stack';

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack');
/** 
 * This doesn't work yet since the setup is difficult 
 * in separated environment */ 
/* new EcsStack(app, 'EcsStack', {
  baseRepo: base.baseRepo,
  baseVpc: base.baseVpc
}); */
new Ec2Stack(app, 'Ec2Stack', {
  baseRepo: base.baseRepo,
  baseVpc: base.baseVpc
});