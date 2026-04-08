import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LeaderboardLambdaStackProps extends cdk.StackProps {
  environment: string;
  // Database tables
  leaderboardEntriesTable: dynamodb.Table;
  userAggregatesTable: dynamodb.Table;
  rateLimitBucketsTable: dynamodb.Table;
  // Cognito
  userPool: cognito.UserPool;
  // EventBridge - pass ARNs instead of objects to avoid cyclic dependencies
  gameEventsEventBusArn: string;
  leaderboardDLQArn: string;
}

/**
 * Leaderboard Lambda Stack
 * Lambda function for leaderboard and scoring system
 */
export class LeaderboardLambdaStack extends cdk.Stack {
  public readonly leaderboardFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LeaderboardLambdaStackProps) {
    super(scope, id, props);

    // Import the event bus by ARN to avoid cyclic dependencies
    const gameEventsEventBus = events.EventBus.fromEventBusArn(
      this,
      'GameEventsEventBus',
      props.gameEventsEventBusArn
    );

    // Import the DLQ by ARN to avoid cyclic dependencies
    const leaderboardDLQ = sqs.Queue.fromQueueArn(
      this,
      'LeaderboardDLQ',
      props.leaderboardDLQArn
    );

    // Create CloudWatch Log Group for Leaderboard Service
    const logGroup = new logs.LogGroup(this, 'LeaderboardServiceLogs', {
      logGroupName: `/aws/lambda/leaderboard-service-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Resolve project root (works from both src and dist)
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    const servicesRoot = path.resolve(projectRoot, '..');

    // Leaderboard Service Lambda with NodejsFunction for automatic bundling
    this.leaderboardFunction = new nodejs.NodejsFunction(this, 'LeaderboardFunction', {
      functionName: `MemoryGame-LeaderboardService-${props.environment}`,
      description: 'Leaderboard service - score calculation, rankings, and leaderboard queries',
      entry: path.join(servicesRoot, 'services/leaderboard/src/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        NODE_ENV: props.environment,
        LEADERBOARD_TABLE_NAME: props.leaderboardEntriesTable.tableName,
        USER_AGGREGATES_TABLE_NAME: props.userAggregatesTable.tableName,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        RATE_LIMIT_TABLE_NAME: props.rateLimitBucketsTable.tableName,
        EVENT_BUS_NAME: gameEventsEventBus.eventBusName,
        LOG_LEVEL: props.environment === 'prod' ? 'INFO' : 'DEBUG',
      },
      bundling: {
        minify: props.environment === 'prod',
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
        format: nodejs.OutputFormat.CJS,
        tsconfig: path.join(servicesRoot, 'services/leaderboard/tsconfig.json'),
      },
      logGroup: logGroup,
    });

    // Grant Leaderboard Lambda permissions for DynamoDB tables
    this.leaderboardFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:BatchWriteItem',
        ],
        resources: [
          props.leaderboardEntriesTable.tableArn,
          `${props.leaderboardEntriesTable.tableArn}/index/*`,
          props.userAggregatesTable.tableArn,
          `${props.userAggregatesTable.tableArn}/index/*`,
          props.rateLimitBucketsTable.tableArn,
        ],
      })
    );

    // Grant CloudWatch PutMetricData permission
    this.leaderboardFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // Grant EventBridge permissions to receive events
    this.leaderboardFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['events:PutEvents'],
        resources: [props.gameEventsEventBusArn],
      })
    );

    // Create EventBridge rule to route GameCompleted events to Leaderboard Service
    // Create the rule directly here to avoid cross-stack reference issues
    const gameCompletedRule = new events.Rule(this, 'GameCompletedRule', {
      eventBus: gameEventsEventBus,
      ruleName: `GameCompleted-to-Leaderboard-${props.environment}`,
      description: 'Route GameCompleted events from game-service to Leaderboard Service',
      eventPattern: {
        source: ['game-service'],
        detailType: ['GameCompleted'],
      },
    });

    // Add Lambda as target with retry policy and DLQ
    gameCompletedRule.addTarget(
      new cdk.aws_events_targets.LambdaFunction(this.leaderboardFunction, {
        retryAttempts: 3,
        maxEventAge: cdk.Duration.hours(1),
        deadLetterQueue: leaderboardDLQ,
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'LeaderboardFunctionName', {
      value: this.leaderboardFunction.functionName,
      description: 'Leaderboard Service Lambda Function Name',
      exportName: `LeaderboardService-FunctionName-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'LeaderboardFunctionArn', {
      value: this.leaderboardFunction.functionArn,
      description: 'Leaderboard Service Lambda Function ARN',
      exportName: `LeaderboardService-FunctionArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'LeaderboardLogGroupName', {
      value: logGroup.logGroupName,
      description: 'Leaderboard Service CloudWatch Log Group Name',
      exportName: `LeaderboardService-LogGroupName-${props.environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'LeaderboardLambda');
    cdk.Tags.of(this).add('Service', 'Leaderboard');
  }
}
