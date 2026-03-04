import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';
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

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'EventBridge');
  }
}
