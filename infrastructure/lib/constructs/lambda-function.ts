import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface LambdaFunctionProps {
  functionName: string;
  description: string;
  handler: string;
  code: lambda.Code;
  runtime?: lambda.Runtime;
  memorySize?: number;
  timeout?: cdk.Duration;
  environment?: { [key: string]: string };
  reservedConcurrentExecutions?: number;
  provisionedConcurrentExecutions?: number;
  logRetention?: logs.RetentionDays;
  tracing?: lambda.Tracing;
}

/**
 * Reusable Lambda Function Construct
 * Provides consistent configuration for all Lambda functions
 */
export class LambdaFunction extends Construct {
  public readonly function: lambda.Function;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);

    // Create log group with retention
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${props.functionName}`,
      retention: props.logRetention || logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function
    this.function = new lambda.Function(this, 'Function', {
      functionName: props.functionName,
      description: props.description,
      runtime: props.runtime || lambda.Runtime.NODEJS_20_X,
      handler: props.handler,
      code: props.code,
      memorySize: props.memorySize || 512,
      timeout: props.timeout || cdk.Duration.seconds(30),
      environment: props.environment || {},
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      tracing: props.tracing || lambda.Tracing.ACTIVE,
      logGroup: this.logGroup,
    });

    // Add provisioned concurrency if specified
    if (props.provisionedConcurrentExecutions) {
      const version = this.function.currentVersion;
      const alias = new lambda.Alias(this, 'Alias', {
        aliasName: 'live',
        version,
        provisionedConcurrentExecutions: props.provisionedConcurrentExecutions,
      });
    }

    // Add tags
    cdk.Tags.of(this.function).add('Service', props.functionName);
    cdk.Tags.of(this.function).add('ManagedBy', 'CDK');
  }

  /**
   * Grant DynamoDB permissions
   */
  grantDynamoDBAccess(tableArns: string[]): void {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:BatchGetItem',
          'dynamodb:BatchWriteItem',
        ],
        resources: tableArns,
      })
    );
  }

  /**
   * Grant EventBridge permissions
   */
  grantEventBridgeAccess(eventBusArn: string): void {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['events:PutEvents'],
        resources: [eventBusArn],
      })
    );
  }

  /**
   * Grant CloudWatch metrics permissions
   */
  grantCloudWatchMetrics(): void {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );
  }

  /**
   * Grant Cognito permissions
   */
  grantCognitoAccess(userPoolArn: string): void {
    this.function.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminInitiateAuth',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminConfirmSignUp',
        ],
        resources: [userPoolArn],
      })
    );
  }
}
