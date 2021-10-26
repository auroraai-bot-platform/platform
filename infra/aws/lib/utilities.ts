import { PolicyStatement } from "@aws-cdk/aws-iam";
import * as cdk from '@aws-cdk/core';
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from '@aws-cdk/aws-cloudfront';

export function createPrefix(env: string, stack: string) {
  return `${env}.${stack.toLowerCase().split('stack')[0]}.`;
}
