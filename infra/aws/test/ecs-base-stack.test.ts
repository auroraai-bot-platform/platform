import {countResources, expect as expectCDK }from '@aws-cdk/assert';
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
  expectCDK(teststack).to(countResources('AWS::EC2::VPC', 1)
  .and(countResources('AWS::EC2::Subnet', 4))
  .and(countResources('AWS::EC2::RouteTable', 4))
  .and(countResources('AWS::ECR::Repository', 3))
  .and(countResources('AWS::ECS::Cluster', 1))
  .and(countResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1))
  .and(countResources('AWS::Route53::RecordSet', 1))
  );
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
  expectCDK(teststack).to(countResources('AWS::EC2::VPC', 1)
  .and(countResources('AWS::EC2::Subnet', 4))
  .and(countResources('AWS::EC2::RouteTable', 4))
  .and(countResources('AWS::ECR::Repository', 5))
  .and(countResources('AWS::ECS::Cluster', 1))
  .and(countResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1))
  .and(countResources('AWS::Route53::RecordSet', 1))
  );
});