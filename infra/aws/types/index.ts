import * as cdk from '@aws-cdk/core';

export interface BaseStackProps extends cdk.StackProps {
  envName: string;
}

export interface RasaBot {
  actionsPort: number;
  customerName: string;
  projectId: string;
  rasaPort: number;
}