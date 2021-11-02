# AuroraAI ChatBot AWS environment guide and templates

## Todo
- Add cdk template for bootstrapping the environment
- Add cdk template for creating the initial structure
- Create CI/CD to get chatbot into the environment
- Print relevant info to console

## Manual steps

### Creating an environment
- Allow NAT gateway's elastic IP to mongodb (Does not stop deployment)
- Populate secret of the environment in secretsmanager (Does not stop deployment)
export function createEnvironment(app: cdk.App, config: EnvironmentConfiguration) {
- Create a new environment with the `createEnvironment` function and run `cdk deploy <envName>-*`
### Destroying an environment
- Empty and delete ECR repos manually if you destroy environments (After environment destruction)
- Empty and delete the frontend and file s3 buckets for the destroyed environment (After environment destruction)

### Adding a rasabot instance
- Add a new entry to the `RasaBot` array
- Make sure, that provided ports within a single environment are not overlapping
- Run `cdk deploy <envName>-*`

### Removing a rasabot instance
- Remove the entry from the `RasaBot` array
- Run `cdk deploy <envName>-*`
- Empty and delete the ECR repos manually for the rasabot
- Delete the remaining data in the s3 frontend and files bucket

## Naming Convention
To easily identify and find resources in AWS, all resources should follow a strict convention on naming and tagging.

The prefix consists of following parts:
- Environment - e.g. DEMO
- Stack Name  - e.g. BOTFRONT.sStack names should describe the containing functionality. Stacks should describe a modular piece of functionality.

Rules:
- Each part should use only characters or numbers. E.g. `dev`, `compute`
- Parts are divided by a single dash
- The prefix ends in a single dash

A valid prefix looks like this: `dev-compute-`

A resource should be named by its type. If there are multiple resources of the same type in a single stack, they need an additional functional description.

For example:
- `dev-frontend-basicauth-lambda`
- `dev-frontend-api-lambda`
- `prod1-infra-vpc`

Each resource's name hsould follow this convention.
Additionally, each resource should have following tags:
- name: the full prefixed name
- env: the environment name

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

