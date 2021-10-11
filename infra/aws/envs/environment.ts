import * as cdk from '@aws-cdk/core';
import { EcsBaseStack } from '../lib/ecs-base-stack';
import { EcsBfStack } from '../lib/ecs-bf-stack';
import { EcsRasaStack } from '../lib/ecs-rasa-stack';
import { RasaBot } from '../types';

export interface EnvironmentConfiguration {
  domain: string;
  env: {
    account: string;
    region: string;
  }
  envName: string;
  rasaBots: RasaBot[];
  subDomain: string;
}

export function createEnvironment(app: cdk.App, config: EnvironmentConfiguration) {
  
// Demo-ecs env
const ecsBaseStack = new EcsBaseStack(app, 'DemoBaseStack', {
  envName: config.envName,
  ecrRepos: config.rasaBots,
  subDomain: config.subDomain,
  domain: config.domain,
  env: config.env,
});
cdk.Tags.of(ecsBaseStack).add('environment', config.envName)

const ecsBfStack = new EcsBfStack(app, 'DemoBfStack', {
  envName: config.envName,
  baseCluster: ecsBaseStack.baseCluster,
  baseCertificate: ecsBaseStack.baseCertificate,
  baseLoadbalancer: ecsBaseStack.baseLoadBalancer,
  baseVpc: ecsBaseStack.baseVpc,
  domain: config.domain,
  env: config.env,
  mongoSecret: ecsBaseStack.mongoSecret
});
cdk.Tags.of(ecsBfStack).add('environment', config.envName)

const rasaBotStack = new EcsRasaStack(app, `DemoRasaStack`, {
    envName: config.envName,
    baseCluster: ecsBaseStack.baseCluster,
    baseVpc: ecsBaseStack.baseVpc,
    baseLoadbalancer: ecsBaseStack.baseLoadBalancer,
    baseCertificate: ecsBaseStack.baseCertificate,
    botfrontService: ecsBfStack.botfrontService,
    rasaBots: config.rasaBots,
    env: config.env
  });

  cdk.Tags.of(rasaBotStack).add('environment', config.envName);

  return [ecsBaseStack, EcsBfStack, rasaBotStack];
}
