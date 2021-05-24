# AuroraAI ChatBot AWS environment guide and templates

## Todo
- Add cdk template for bootstrapping the environment
- Add cdk template for creating the initial structure
- Create CI/CD to get chatbot into the environment
- Print relevant info to console

## Getting started
- Setup your AWS credentials on your local machine
  - Basic access key and secret access key generation [here](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html)
  - CDK specific guide [here](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
  - Best approach to store and use multiple AWS credentials on your computer is to use [aws-vault](https://github.com/99designs/aws-vault)
- Install node on your system [guide](https://nodejs.org/en/download/)
- Install cdk globally `npm install -g aws-cdk`
- Navigate to the CDK folder `infra/aws`
- Run `npm run build`
- Run `cdk diff` to output the changes to infrastructure
- Run `cdk deploy '*'` to deploy everything

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
