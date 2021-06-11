import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { BaseStackProps } from '../types';
import { createPrefix } from './utilities';

interface CertificateProps extends BaseStackProps {
  subDomain: string;
  hostedZoneId: string;
}


export class CertificateStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;

  constructor(scope: cdk.Construct, id: string, props: CertificateProps) {

    // force Stack to be created in us-east-1, because of cloudformation
    super(scope, id, { env: { region: "us-east-1" } });
    const prefix = createPrefix(props.envName, this.constructor.name);

    const hostedZone = route53.HostedZone.fromHostedZoneId(this, 'hostedZone', props.hostedZoneId);

    const cert = new acm.Certificate(this, `${prefix}hosted-zone-certificate`, {
      domainName: props.subDomain,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    this.certificate = cert;
  }
}