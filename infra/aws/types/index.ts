import * as cdk from '@aws-cdk/core';


export interface BaseStackProps extends cdk.StackProps {
  envName: string;
}