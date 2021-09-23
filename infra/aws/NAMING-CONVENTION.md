# Naming Convention
Each resource needs a distinct and self explanatory name to easily understand its location and function.

Advantages of a naming convention:
* less time spent on finding new names
* consistent naming provides easier access to the IaC code and the resources
* reporting based on categories
* less technical debt


## AWS CDK Naming

### The resource naming pattern

The name of each resource should be build after following pattern:

`<environment-name>.<stack-name>.<resource-name>`

### Basics Rules for Naming
There are a couple of basic rules to follow, when creating new names for the infrastructure resources.

* The name of the resource follows a strict pattern from broad terms to narrow terms from left to right
* Use only lower case letters for words
* Separate words of a single term by a `-` (dash)
* Separate terms by a single `.` (dot)
* Do not use abbreviations
* Use shorter rather than longer words

### Examples
* dev.frontend.s3-bucket
* prod-1.rds.rds-instance
* staging.vpc.subnet-private1

## Implementation

### Easy access for prefixes
The terms of environment name and stack name are prefixed inside the class property `prefix`.
The prefix content is `<environment-name>.<stack-name>.`.
Use string interpolation to concatenate the prefix with the resource name.

```javascript
const prefix = 'dev.vpc.';

const subnetName = `${prefix}subnet-private1`;
```

### Use
AWS uses the `Name` tag for many resources to display a name. In other cases the resource id is used.
**The naming convention is therefore used for both, the `Name` tag and the resource id.**
```javascript
const tableName = `${prefix}user-table`;
const usersTable = new dynamodb.Table(this, tableName);
Tags.of(usersTable).add('Name', tableName);
```

### Additional Tags
Additional to the `Name` tag, the `environment` tag is added to the application.

```javascript
const environment = 'dev';
const app = new cdk.App();
Tags.of(app).add('environment', 'dev');
```