import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  // Lambda functions
  authFunction: lambda.Function;
  gameFunction: lambda.Function;
  // DynamoDB tables
  usersTable: dynamodb.Table;
  gamesTable: dynamodb.Table;
  leaderboardsTable: dynamodb.Table;
  subscriptionsTable: dynamodb.Table;
  themesTable: dynamodb.Table;
  achievementsTable: dynamodb.Table;
  rateLimitsTable: dynamodb.Table;
  userSettingsTable: dynamodb.Table;
  // API Gateway
  httpApi: apigatewayv2.HttpApi;
  // Alert email
  alertEmail?: string;
}

/**
 * Monitoring Stack
 * CloudWatch alarms and SNS notifications
 */
export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create SNS Topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `MemoryGame-Alarms-${props.environment}`,
      displayName: 'Memory Game Alarms',
    });

    // Subscribe email if provided
    if (props.alertEmail) {
      this.alarmTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // Lambda Function Alarms
    this.createLambdaAlarms(props.authFunction, 'Auth');
    this.createLambdaAlarms(props.gameFunction, 'Game');

    // DynamoDB Table Alarms
    this.createDynamoDBAlarms(props.usersTable, 'Users');
    this.createDynamoDBAlarms(props.gamesTable, 'Games');
    this.createDynamoDBAlarms(props.leaderboardsTable, 'Leaderboards');
    this.createDynamoDBAlarms(props.subscriptionsTable, 'Subscriptions');
    this.createDynamoDBAlarms(props.themesTable, 'Themes');
    this.createDynamoDBAlarms(props.achievementsTable, 'Achievements');
    this.createDynamoDBAlarms(props.rateLimitsTable, 'RateLimits');
    this.createDynamoDBAlarms(props.userSettingsTable, 'UserSettings');

    // API Gateway Alarms
    this.createApiGatewayAlarms(props.httpApi);

    // Create Dashboard
    this.createDashboard(props);

    // Outputs
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarms',
      exportName: `MemoryGame-AlarmTopicArn-${props.environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'Monitoring');
  }

  private createLambdaAlarms(fn: lambda.Function, serviceName: string): void {
    // Error rate alarm (> 5%)
    const errorAlarm = new cloudwatch.Alarm(this, `${serviceName}ErrorAlarm`, {
      alarmName: `MemoryGame-${serviceName}-ErrorRate`,
      metric: fn.metricErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Duration alarm (> 5 seconds)
    const durationAlarm = new cloudwatch.Alarm(this, `${serviceName}DurationAlarm`, {
      alarmName: `MemoryGame-${serviceName}-Duration`,
      metric: fn.metricDuration({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5000, // 5 seconds in milliseconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    durationAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Throttle alarm
    const throttleAlarm = new cloudwatch.Alarm(this, `${serviceName}ThrottleAlarm`, {
      alarmName: `MemoryGame-${serviceName}-Throttles`,
      metric: fn.metricThrottles({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    throttleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  private createDynamoDBAlarms(table: dynamodb.Table, tableName: string): void {
    // Read throttle alarm
    const readThrottleAlarm = new cloudwatch.Alarm(this, `${tableName}ReadThrottleAlarm`, {
      alarmName: `MemoryGame-${tableName}-ReadThrottles`,
      metric: table.metricUserErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    readThrottleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // System errors alarm
    const systemErrorsAlarm = new cloudwatch.Alarm(this, `${tableName}SystemErrorsAlarm`, {
      alarmName: `MemoryGame-${tableName}-SystemErrors`,
      metric: table.metricSystemErrorsForOperations({
        operations: [dynamodb.Operation.GET_ITEM, dynamodb.Operation.PUT_ITEM, dynamodb.Operation.QUERY],
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    systemErrorsAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  private createApiGatewayAlarms(api: apigatewayv2.HttpApi): void {
    // 5xx error rate alarm
    const serverErrorAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: 'MemoryGame-API-5xxErrors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiId: api.apiId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    serverErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Latency alarm (> 1 second)
    const latencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: 'MemoryGame-API-Latency',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiId: api.apiId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000, // 1 second in milliseconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    latencyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  private createDashboard(props: MonitoringStackProps): void {
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `MemoryGame-${props.environment}`,
    });

    // Lambda metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations',
        left: [
          props.authFunction.metricInvocations(),
          props.gameFunction.metricInvocations(),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors',
        left: [
          props.authFunction.metricErrors(),
          props.gameFunction.metricErrors(),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration',
        left: [
          props.authFunction.metricDuration(),
          props.gameFunction.metricDuration(),
        ],
      })
    );

    // DynamoDB metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Read Capacity',
        left: [
          props.gamesTable.metricConsumedReadCapacityUnits(),
          props.usersTable.metricConsumedReadCapacityUnits(),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Write Capacity',
        left: [
          props.gamesTable.metricConsumedWriteCapacityUnits(),
          props.usersTable.metricConsumedWriteCapacityUnits(),
        ],
      })
    );

    // API Gateway metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: { ApiId: props.httpApi.apiId },
            statistic: 'Sum',
          }),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: { ApiId: props.httpApi.apiId },
            statistic: 'Average',
          }),
        ],
      })
    );
  }
}
