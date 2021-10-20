
import { expect as expectCDK, haveResource, countResources, countResourcesLike } from '@aws-cdk/assert';
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


test('Check base stack resources with one bot', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new EcsBaseStack(app, 'MyTestStack', {
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
    expectCDK(stack).to(countResources('AWS::EC2::VPC', 1)
    .and(countResources('AWS::EC2::Subnet', 4))
    .and(countResources('AWS::EC2::RouteTable', 4))
    .and(countResources('AWS::EC2::SubnetRouteTableAssociation', 4))
    .and(countResources('AWS::EC2::Route', 4))
    .and(countResources('AWS::EC2::EIP', 1))
    .and(countResources('AWS::EC2::NatGateway', 1))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-botfront'
    }))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-actions-veryrealcustomer'
    }))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-rasa-veryrealcustomer'
    }))
    .and(countResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1))
    .and(countResources('AWS::SecretsManager::Secret', 1))
    .and(countResources('AWS::EC2::SecurityGroup', 1))
    .and(countResources('AWS::Route53::RecordSet', 1))
    );
});

test('Check base stack resources with two bots', () => {
    const app = new cdk.App();
    ecrRepos = [
        {rasaPort: 1, actionsPort: 2, projectId: 'veryrealid', customerName: 'veryrealcustomer'},
        {rasaPort: 3, actionsPort: 4, projectId: 'veryrealid2', customerName: 'veryrealcustomer2'}
    ];

    // WHEN
    const stack = new EcsBaseStack(app, 'MyTestStack', {
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
    expectCDK(stack).to(countResources('AWS::EC2::VPC', 1)
    .and(countResources('AWS::EC2::Subnet', 4))
    .and(countResources('AWS::EC2::RouteTable', 4))
    .and(countResources('AWS::EC2::SubnetRouteTableAssociation', 4))
    .and(countResources('AWS::EC2::Route', 4))
    .and(countResources('AWS::EC2::EIP', 1))
    .and(countResources('AWS::EC2::NatGateway', 1))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-botfront'
    }))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-actions-veryrealcustomer'
    }))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-rasa-veryrealcustomer'
    }))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-actions-veryrealcustomer2'
    }))
    .and(countResourcesLike('AWS::ECR::Repository', 1, {
        'RepositoryName': 'test-rasa-veryrealcustomer2'
    }))
    .and(countResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1))
    .and(countResources('AWS::SecretsManager::Secret', 1))
    .and(countResources('AWS::EC2::SecurityGroup', 1))
    .and(countResources('AWS::Route53::RecordSet', 1))
    );
});

