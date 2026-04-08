import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface LeaderboardEventRuleProps {
  /**
   * The event bus to create the rule on
   */
  eventBus: events.IEventBus;

  /**
   * The Lambda function to invoke when GameCompleted events are received
   */
  targetFunction: lambda.IFunction;

  /**
   * Dead letter queue for failed event processing
   */
  deadLetterQueue: sqs.IQueue;

  /**
   * Environment name (dev, staging, prod)
   */
  environment: string;
}

/**
 * Construct for creating the EventBridge rule that routes GameCompleted events
 * to the Leaderboard Service Lambda.
 * 
 * This implements the event-driven architecture for the leaderboard system:
 * - Matches GameCompleted events from game-service
 * - Routes to Leaderboard Service Lambda
 * - Configures retry policy (max 3 attempts, max event age 1 hour)
 * - Sends failed events to dead-letter queue
 */
export class LeaderboardEventRule extends Construct {
  public readonly rule: events.Rule;

  constructor(scope: Construct, id: string, props: LeaderboardEventRuleProps) {
    super(scope, id);

    // Create EventBridge rule to route GameCompleted events to Leaderboard Service
    this.rule = new events.Rule(this, 'GameCompletedRule', {
      eventBus: props.eventBus,
      ruleName: `GameCompleted-to-Leaderboard-${props.environment}`,
      description: 'Route GameCompleted events from game-service to Leaderboard Service',
      eventPattern: {
        source: ['game-service'],
        detailType: ['GameCompleted'],
      },
      targets: [
        new targets.LambdaFunction(props.targetFunction, {
          // Configure retry policy
          retryAttempts: 3,
          maxEventAge: cdk.Duration.hours(1),
          // Send failed events to DLQ
          deadLetterQueue: props.deadLetterQueue,
        }),
      ],
    });

    // Note: Outputs are not created here to avoid cyclic dependencies
    // The rule ARN can be accessed via this.rule.ruleArn if needed
  }
}
