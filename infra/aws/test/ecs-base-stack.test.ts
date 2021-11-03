import '@aws-cdk/assert/jest'
import * as cdk from '@aws-cdk/core';
import { EcsBaseStack } from '../lib/ecs-base-stack';
import { RasaBot } from '../types';
import { DefaultRepositories } from '../envs/environment';

const envName = 'test';
const subDomain = 'test';
const domain = 'test.test';
const region = 'test';
const account = '0123456789'

const defaultRepositories: DefaultRepositories = {
    actionsRepository: 'test',
    botfrontRepository: 'test',
    rasaBotRepository: 'test',
};
let ecrRepos: RasaBot[] = [{rasaPort: 1, actionsPort: 2, projectId: 'veryrealid', customerName: 'veryrealcustomer'}];

test('Create base-stack with one bot without snapshot', () => {
  const app = new cdk.App();
  // WHEN
  const teststack = new EcsBaseStack(app, 'MyTestStack', {
    envName,
    subDomain,
    ecrRepos,
    domain,
    env: {
      region,
      account
    },
    defaultRepositories
  });
  // THEN
  expect(teststack).toHaveResource('AWS::EC2::VPC');
  expect(teststack).toHaveResource('AWS::EC2::Subnet');
  expect(teststack).toHaveResource('AWS::EC2::RouteTable');
  
});

test('Create base-stack with two bots', () => {
  const app = new cdk.App();
  ecrRepos = [
    {rasaPort: 1, actionsPort: 2, projectId: 'veryrealid', customerName: 'veryrealcustomer'},
    {rasaPort: 3, actionsPort: 4, projectId: 'veryrealid2', customerName: 'veryrealcustomer2'}
  ];

  // WHEN
  const teststack = new EcsBaseStack(app, 'MyTestStack', {
    envName,
    subDomain,
    ecrRepos,
    domain,
    env: {
      region,
      account
    },
    defaultRepositories
  });
  // THEN
  expect(teststack).toHaveResource('AWS::EC2::VPC');
  expect(teststack).toHaveResource('AWS::EC2::Subnet');
});