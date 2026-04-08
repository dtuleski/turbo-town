import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { LeaderboardEventRule } from '../constructs/leaderboard-event-rule';

export interface LeaderboardEventRuleStackProps extends cdk.StackProps {
  environment: string;
  gameEventsEventBus: events.IEventBus;
  leaderboardFunction: lambda.IFunction;
  leaderboardDLQ: sqs.IQueue;
}

/**
 * Leaderboard Event Rule Stack
 * Creates the EventBridge rule to route GameCompleted events to Leaderboard Service
 * 
 * This is a separate stack to avoid cyclic dependencies between EventBridge and Lambda stacks.
 */
export class LeaderboardEventRuleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LeaderboardEventRuleStackProps) {
    super(scope, id, props);

    // Create EventBridge rule to route GameCompleted events to Leaderboard Service
    const leaderboardEventRule = new LeaderboardEventRule(this, 'LeaderboardEventRule', {
      eventBus: props.gameEventsEventBus,
      targetFunction: props.leaderboardFunction,
      deadLetterQueue: props.leaderboardDLQ,
      environment: props.environment,
    });

    // Tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Stack', 'LeaderboardEventRule');
  }
}
