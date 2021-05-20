import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';

const prefix = 'demo-ui-';

export class BaseStack extends cdk.Stack {
  
  //public readonly baseSecurityGroup: ec2.ISecurityGroup
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceBucket = new s3.Bucket(this, `${prefix}bucket`);

    const a = new cloudfront.CloudFrontWebDistribution(this, `${prefix}distribution`, {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: sourceBucket
          },
          behaviors: [
            {
              isDefaultBehavior: true
            }
          ]
        }
      ]
    });

  }
}
