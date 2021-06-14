import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53targets from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager'

import { BaseStackProps } from '../types/index';
import { createPrefix } from './utilities';

interface WebChatProps extends BaseStackProps {
  rasaIp: string,
  domain: string,
  subDomain: string
}


export class WebChatStack extends cdk.Stack {
  
  constructor(scope: cdk.Construct, id: string, props: WebChatProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);
    const bucket = new s3.Bucket(this, `${prefix}frontend-bucket`, {bucketName: `${prefix}frontend-bucket`, publicReadAccess: false});

    const hostedZone = route53.HostedZone.fromLookup(this, 'hostedZone', {domainName: props.domain});

    const cert = new acm.DnsValidatedCertificate(this, 'httpscert', {
      domainName: props.subDomain,
      hostedZone,
      region: 'us-east-1'
    });

    const cloudfrontAI = new cloudfront.OriginAccessIdentity(this, `${prefix}distribution-accessidentity`, {
    });
    bucket.grantRead(cloudfrontAI);

    const edgeLambda = new cloudfront.experimental.EdgeFunction(this, `${prefix}basicauth-lambda`, {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: new lambda.AssetCode('../../packages/basic-auth-lambda'),
      handler: 'index.handler',
      functionName: `${prefix}basicauth-lambda`,
    });

    const cloudFrontWebDistribution = new cloudfront.CloudFrontWebDistribution(this, `${prefix}distribution`, {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: cloudfrontAI
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              lambdaFunctionAssociations: [
                {
                  eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
                  lambdaFunction: edgeLambda
                }
              ]
            }
          ]
        }
      ],
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(cert, {
        aliases: [
          props.subDomain
        ],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019
      })
    });

    new route53.ARecord(this, 'cf-route53', {
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(cloudFrontWebDistribution)),
      zone: hostedZone,
      recordName: props.subDomain
    });

  }
}