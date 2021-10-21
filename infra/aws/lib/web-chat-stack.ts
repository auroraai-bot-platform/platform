import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53targets from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager'

import { BaseStackProps, RasaBot } from '../types/index';
import { createPrefix } from './utilities';

interface WebChatProps extends BaseStackProps {
  domain: string;
  rasaBots: RasaBot[];
  subDomain: string;
}


const frontendVersion = '0.0.1';
const sourceBucketName = 'aurora-source-code-bucket';
export class WebChatStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: WebChatProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);
    // const bucket = new s3.Bucket(this, `${prefix}frontend-bucket`, { bucketName: `${prefix}frontend-bucket`, publicReadAccess: false });
    const fileBucket = new s3.Bucket(this, `${prefix}file-bucket`, { bucketName: `${prefix}file-bucket`, publicReadAccess: false });

    const cloudfrontAI = new cloudfront.OriginAccessIdentity(this, `${prefix}distribution-access-identity`, {
    });

    const bucket = s3.Bucket.fromBucketName(this, sourceBucketName, sourceBucketName);

    bucket.grantRead(cloudfrontAI);
    fileBucket.grantRead(cloudfrontAI);

    new s3deploy.BucketDeployment(this, `${prefix}file-bucket-deployment`, {
      sources: [s3deploy.Source.asset('../../files')],
      destinationBucket: fileBucket,
      destinationKeyPrefix: 'files'
    });

    const hostedZone = route53.HostedZone.fromLookup(this, `${prefix}hosted-zone`, { domainName: props.domain });

    for (const rasaBot of props.rasaBots) {

      const rasaBotDomain = `${rasaBot.customerName}.${props.subDomain}`;

      const cert = new acm.DnsValidatedCertificate(this, `${prefix}https-certificate-${rasaBot.customerName}`, {
        domainName: rasaBotDomain,
        hostedZone,
        region: 'us-east-1'
      });

      const cloudFrontWebDistribution = new cloudfront.CloudFrontWebDistribution(this, `${prefix}frontend-distribution-${rasaBot.customerName}`, {
        defaultRootObject: 'index.html',
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: fileBucket,
              originAccessIdentity: cloudfrontAI
            },
            behaviors: [{ pathPattern: `/files/*` }]
          },
          {
            s3OriginSource: {
              originAccessIdentity: cloudfrontAI,
              originPath: `/${rasaBot.customerName}`,
              s3BucketSource: bucket,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
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

      new route53.ARecord(this, `${prefix}cf-route53-${rasaBot.customerName}`, {
        target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(cloudFrontWebDistribution)),
        zone: hostedZone,
        recordName: props.subDomain
      });

    }
  }
}