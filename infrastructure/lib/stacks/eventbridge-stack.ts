import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface EventBridgeStackProps extends cdk.StackProps {
  environment: string;
}

/**
 * EventBridge Stack
 * Event bus for async service communication
 */
export class EventBridgeStack extends cdk.Stack {
  public readonly eventBus: events.EventBus;
  public readonly gameEventsEventBus: events.EventBus;
  public readonly leaderboardDLQ: sqs.Queue;

  constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
    super(scope, id, props);

    // Create Event Bus
    this.eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: `MemoryGame-${props.environment}`,
    });

    // Create CloudWatch Log Group for event archive
    const logGroup = new logs.LogGroup(this, 'EventBusLogs', {
      logGroupName: `/aws/events/memory-game-${props.environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Archive all events for debugging and replay
    const archive = new events.Archive(this, 'EventArchive', {
      sourceEventBus: this.eventBus,
      archiveName: `MemoryGame-Archive-${props.environment}`,
      description: 'Archive of all Memory Game events for debugging and replay',
      retention: cdk.Duration.days(7),
      eventPattern: {
        source: events.Match.prefix('memory-game'),
      },
    });

    // Create rule to log all events to CloudWatch
    const logAllEventsRule = new events.Rule(this, 'LogAllEventsRule', {
      eventBus: this.eventBus,
      ruleName: `MemoryGame-LogAllEvents-${props.environment}`,
      description: 'Log all events to CloudWatch for monitoring',
      eventPattern: {
        source: events.Match.prefix('memory-game'),
      },
      targets: [
        new cdk.aws_events_targets.CloudWatchLogGroup(logGroup),
      ],
    });

    // Create Dead Letter Queue for failed event processing
    const dlqQueue = new cdk.aws_sqs.Queue(this, 'EventDLQ', {
      queueName: `MemoryGame-EventDLQ-${props.environment}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: cdk.aws_sqs.QueueEncryption.KMS_MANAGED,
    });

    // ========================================
    // Leaderboard System Event Infrastructure
    // ========================================

    // Create game-events event bus for leaderboard system
    this.gameEventsEventBus = new events.EventBus(this, 'GameEventsEventBus', {
      eventBusName: `game-events-${props.environment}`,
    });

    // Create Dead Letter Queue for leaderboard event processing failures
    this.leaderboardDLQ = new sqs.Queue(this, 'LeaderboardDLQ', {
      queueName: `leaderboard-dlq-${props.environment}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    // Create CloudWatch Log Group for game-events
    const gameEventsLogGroup = new logs.LogGroup(this, 'GameEventsLogs', {
      logGroupName: `/aws/events/game-events-${props.environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Archive game events for debugging and replay
    const gameEventsArchive = new events.Archive(this, 'GameEventsArchive', {
      sourceEventBus: this.gameEventsEventBus,
      archiveName: `GameEvents-Archive-${props.environment}`,
      description: 'Archive of all game events for leaderboard system',
      retention: cdk.Duration.days(7),
      eventPattern: {
        source: ['game-service'],
      },
    });

    // Create rule to log all game events to CloudWatch
    const logGameEventsRule = new events.Rule(this, 'LogGameEventsRule', {
      eventBus: this.gameEventsEventBus,
      ruleName: `GameEvents-LogAll-${props.environment}`,
      description: 'Log all game events to CloudWatch for monitoring',
      eventPattern: {
        source: ['game-service'],
      },
      targets: [
        new cdk.aws_events_targets.CloudWatchLogGroup(gameEventsLogGroup),
      ],
    });

    // Note: The rule to route GameCompleted events to Leaderboard Service Lambda
    // will be created in the Lambda stack once the Leaderboard Service Lambda is created.
    // This is because EventBridge rules need the Lambda function ARN as a target.

    // Outputs
    new cdk.CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge Event Bus Name',
      exportName: `MemoryGame-EventBusName-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      description: 'EventBridge Event Bus ARN',
      exportName: `MemoryGame-EventBusArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'EventArchiveName', {
      value: archive.archiveName,
      description: 'EventBridge Archive Name',
      exportName: `MemoryGame-EventArchiveName-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'EventDLQUrl', {
      value: dlqQueue.queueUrl,
      description: 'Event Dead Letter Queue URL',
      exportName: `MemoryGame-EventDLQUrl-${props.environment}`,
    });

    // Leaderboard System Outputs
    new cdk.CfnOutput(this, 'GameEventsEventBusName', {
      value: this.gameEventsEventBus.eventBusName,
      description: 'Game Events EventBridge Event Bus Name',
      exportName: `GameEvents-EventBusName-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'GameEventsEventBusArn', {
      value: this.gameEventsEventBus.eventBusArn,
      description: 'Game Events EventBridge Event Bus ARN',
      exportName: `GameEvents-EventBusArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'LeaderboardDLQUrl', {
      value: this.leaderboardDLQ.queueUrl,
      description: 'Leaderboard Dead Letter Queue URL',
      exportName: `Leaderboard-DLQUrl-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'LeaderboardDLQArn', {
      value: this.leaderboardDLQ.queueArn,
      description: 'Leaderboard Dead Letter Queue ARN',
      exportName: `Leaderboard-DLQArn-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'GameEventsArchiveName', {
      value: gameEventsArchive.archiveName,
      description: 'Game Events Archive Name',
      exportName: `GameEvents-ArchiveName-${props.environment}`,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'EventBridge');
  }
}
