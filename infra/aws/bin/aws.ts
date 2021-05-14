#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BaseStack } from '../lib/base-stack';
import { ApplicationStack } from '../lib/application-stack';

const app = new cdk.App();
const base = new BaseStack(app, 'BaseStack');
new ApplicationStack(app, 'ApplicationStack', {
  baseRepo: base.baseRepo,
  baseVpc: base.baseVpc
})
