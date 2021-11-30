#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RasaBot } from '../types';
import { createEnvironment, DefaultRepositories } from '../envs/environment';

const region = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION || 'eu-north-1';
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT || '';

const app = new cdk.App();

console.log({account});

// ECR repositories
const defaultRepositories: DefaultRepositories = {
  actionsRepository: '530123621479.dkr.ecr.eu-north-1.amazonaws.com/actions-private:latest',
  botfrontRepository: '530123621479.dkr.ecr.eu-north-1.amazonaws.com/botfront-private:latest',
  rasaBotRepository: '530123621479.dkr.ecr.eu-north-1.amazonaws.com/rasa-private:latest',
};

// Base domain
const domain = 'aaibot.link';

// Environments
// RasaBots customerName must be unique!

// Customer environment
const hyteEnvName = 'hyte';
const hyteSubDomain = `${hyteEnvName}.${domain}`;

const palmuEnvName = 'palmu';
const palmuSubDomain = `${palmuEnvName}.${domain}`;

const customerEnvName = 'customer';
const customerSubDomain = `${customerEnvName}.${domain}`;
const customerWebChatSubDomain = `chat.${customerSubDomain}`;
const customerRasaBots: RasaBot[] = [{rasaPort: 5005, actionsPort: 5055, projectId: 'HFqcqN9LEiDo8u2N7', customerName: 'hyte-firstbot', additionalConfig: {
  intents: {
    onerva: '/aloita{"oma_organisaatio": "onerva"}',
    vamos: '/aloita{"oma_organisaatio": "vamos"}',
    helsinkimissio: '/aloita{"oma_organisaatio": "helsinki missio"}',
    poikienpuhelin: '/aloita{"oma_organisaatio": "poikien puhelin"}',
    asemanlapset: '/aloita{"oma_organisaatio": "aseman lapset"}'
  }
}}];

const customerenv = createEnvironment(app, {
  domain,
  defaultRepositories,
  env: {account, region},
  envName: customerEnvName,
  rasaBots: customerRasaBots,
  subDomain: customerSubDomain
});

// Demo environment
const demoEnvName = 'demo';
const demoSubDomain = `${demoEnvName}.${domain}`;
const demoWebChatSubDomain = `chat.${demoSubDomain}`;
const demoRasaBots: RasaBot[] = [
  {
    rasaPort: 5006,
    actionsPort: 5055,
    projectId: 'hH4Z8S7GXiHsp3PTP',
    customerName: 'demo-1'
  }, 
  {
    rasaPort: 5005,
    actionsPort: 5056,
    projectId: 'h5W28PhKxRYYFkh2N',
    customerName: 'hytebot-demo',
    additionalConfig: {
      intents: {
        onerva: '/aloita{"oma_organisaatio": "onerva"}',
        vamos: '/aloita{"oma_organisaatio": "vamos"}',
        helsinkimissio: '/aloita{"oma_organisaatio": "helsinki missio"}',
        poikienpuhelin: '/aloita{"oma_organisaatio": "poikien puhelin"}',
        asemanlapset: '/aloita{"oma_organisaatio": "aseman lapset"}'      
      }
    }
  },
  {
    rasaPort: 5007,
    actionsPort: 5057,
    projectId: 'C6y53duQKrDhBqFRp',
    customerName: 'palmu-demo'
  }
];

const demoenv = createEnvironment(app, {
  domain,
  defaultRepositories,
  env: {account, region},
  envName: demoEnvName,
  rasaBots: demoRasaBots,
  subDomain: demoSubDomain
});

// Test environment
const testEnvName = 'test';
const testSubDomain = `${testEnvName}.${domain}`;
const testWebChatSubDomain = `chat.${demoSubDomain}`;
const testRasaBots: RasaBot[] = [{rasaPort: 5006, actionsPort: 5055, projectId: 'test-project', customerName: 'test-1'}];

const testEnv = createEnvironment(app, {
  domain,
  defaultRepositories,
  env: {account, region},
  envName: testEnvName,
  rasaBots: testRasaBots,
  subDomain: testSubDomain
});
