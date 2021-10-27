
import * as fs from 'fs-extra';

import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as route53 from '@aws-cdk/aws-route53';
import * as route53targets from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager'

import { BaseStackProps, RasaBot } from '../types/index';
import { createPrefix } from './utilities';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { BucketPolicy } from '@aws-cdk/aws-s3';

interface WebChatProps extends BaseStackProps {
  domain: string;
  rasaBots: RasaBot[];
  subDomain: string;
}

const frontendVersion = '0.0.3';
const sourceBucketName = 'auroraai-source-code-bucket';
export class WebChatStack extends cdk.Stack {
  public readonly rasaBotAddressMap: Map<RasaBot, string> = new Map<RasaBot, string>();

  constructor(scope: cdk.Construct, id: string, props: WebChatProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);
    const frontendBucket = new s3.Bucket(this, `${prefix}frontend-bucket`, { bucketName: `${prefix}frontend-bucket`, publicReadAccess: false });
    const fileBucket = new s3.Bucket(this, `${prefix}file-bucket`, { bucketName: `${prefix}file-bucket`, publicReadAccess: false });

    const cloudfrontAI = new cloudfront.OriginAccessIdentity(this, `${prefix}distribution-access-identity`, {
    });

    const codeBucket = s3.Bucket.fromBucketName(this, sourceBucketName, sourceBucketName);

    frontendBucket.grantRead(cloudfrontAI);
    fileBucket.grantRead(cloudfrontAI);

    const policyStatement = new PolicyStatement();
    policyStatement.addActions('s3:GetBucket*');
    policyStatement.addActions('s3:GetObject*');
    policyStatement.addActions('s3:List*');
    policyStatement.addResources(codeBucket.bucketArn);
    policyStatement.addResources(`${codeBucket.bucketArn}/*`);
    policyStatement.addCanonicalUserPrincipal(cloudfrontAI.cloudFrontOriginAccessIdentityS3CanonicalUserId);

    if (!codeBucket.policy) {
      new BucketPolicy(this, 'Policy', { bucket: codeBucket }).document.addStatements(policyStatement);
    } else {
      codeBucket.policy.document.addStatements(policyStatement);
    }

    new s3deploy.BucketDeployment(this, `${prefix}file-bucket-deployment`, {
      sources: [s3deploy.Source.asset('../../files')],
      destinationBucket: fileBucket,
      destinationKeyPrefix: 'files'
    });

    const hostedZone = route53.HostedZone.fromLookup(this, `${prefix}hosted-zone`, { domainName: props.domain });

    const cert = new acm.DnsValidatedCertificate(this, `${prefix}wildcard-https-certificate`, {
      domainName: `*.${props.subDomain}`,
      hostedZone,
      region: 'us-east-1'
    });

    // clear up the temp folder
    fs.removeSync(`temp/${prefix}`);

    for (const rasaBot of props.rasaBots) {

      const rasaBotDomain = `${rasaBot.customerName}.${props.subDomain}`;

      // write rasa config files to temp folder for the deployment
      fs.mkdirSync(`temp/${prefix}/${rasaBot.customerName}/config`, { recursive: true });
      fs.writeFileSync(`temp/${prefix}/${rasaBot.customerName}/config/rasa-config.json`, `{"url": "${props.subDomain}:${rasaBot.rasaPort}", "language": "fi"}`);

      const cloudFrontWebDistribution = new cloudfront.CloudFrontWebDistribution(this, `${prefix}frontend-distribution-${rasaBot.customerName}`, {
        defaultRootObject: 'index.html',
        errorConfigurations: [{
          errorCode: 404,
          errorCachingMinTtl: 60,
          responseCode: 200,
          responsePagePath: '/index.html'
        }],
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
              originPath: `/frontend/${frontendVersion}`,
              s3BucketSource: codeBucket,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              }
            ]
          },
          {
            s3OriginSource: {
              originAccessIdentity: cloudfrontAI,
              s3BucketSource: frontendBucket,
              originPath: `/frontend-rasa-config/${rasaBot.customerName}`,
            },
            behaviors: [
              {
                pathPattern: '/config/*'
              }
            ]
          }
        ],
        viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(cert, {
          aliases: [
            rasaBotDomain
          ],
          securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019
        })
      });

      new route53.ARecord(this, `${prefix}cf-route53-${rasaBot.customerName}`, {
        target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(cloudFrontWebDistribution)),
        zone: hostedZone,
        recordName: rasaBotDomain
      });

    }

    new s3deploy.BucketDeployment(this, `${prefix}frontend-bucket-deployment`, {
      sources: [s3deploy.Source.asset(`temp/${prefix}`)],
      destinationBucket: frontendBucket,
      destinationKeyPrefix: 'frontend-rasa-config',
      prune: false
    });
  }
}