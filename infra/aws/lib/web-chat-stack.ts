import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';

import { BaseStackProps } from '../types/index';

interface WebChatProps extends BaseStackProps {
  rasaIp: string;
}


export class WebChatStack extends cdk.Stack {
  
  constructor(scope: cdk.Construct, id: string, props: WebChatProps) {
    super(scope, id, props);
    const prefix = createPrefix(props.envName, this.constructor.name);
    const bucket = new s3.Bucket(this, `${prefix}frontend-bucket`, {bucketName: `${prefix}frontend-bucket`, publicReadAccess: false});

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
      ]
    });

  }
}

function createPrefix(env: string, stack: string) {
  return `${env}-${stack.toLowerCase().split('stack')[0]}-`;
}