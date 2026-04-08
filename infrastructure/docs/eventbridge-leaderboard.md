# EventBridge Infrastructure for Leaderboard System

## Overview

This document describes the EventBridge infrastructure created for the leaderboard and scoring system. The infrastructure implements an event-driven architecture that decouples game completion from score calculation and leaderboard updates.

## Architecture

```
Game Service Lambda
       |
       | publishes GameCompleted event
       v
game-events Event Bus
       |
       | routes via EventBridge Rule
       v
Leaderboard Service Lambda
       |
       | on failure (after retries)
       v
leaderboard-dlq (SQS)
```

## Resources Created

### 1. game-events Event Bus

**Resource Name**: `game-events-{environment}`
**Purpose**: Dedicated event bus for game-related events in the leaderboard system

**Configuration**:
- Event bus name: `game-events-dev` (for dev environment)
- Source: `game-service`
- Event types: `GameCompleted`

**CloudFormation Output**:
- `GameEventsEventBusName`: The event bus name
- `GameEventsEventBusArn`: The event bus ARN

### 2. Leaderboard Dead Letter Queue (DLQ)

**Resource Name**: `leaderboard-dlq-{environment}`
**Purpose**: Stores failed event processing attempts for manual review

**Configuration**:
- Queue name: `leaderboard-dlq-dev` (for dev environment)
- Message retention: 14 days
- Encryption: KMS managed (alias/aws/sqs)

**CloudFormation Output**:
- `LeaderboardDLQUrl`: The SQS queue URL
- `LeaderboardDLQArn`: The SQS queue ARN

### 3. GameCompleted Event Rule

**Status**: To be created in Phase 2 (Task 3.1)

The EventBridge rule will be created when the Leaderboard Service Lambda is implemented. The rule configuration is defined in the `LeaderboardEventRule` construct.

**Configuration**:
- Rule name: `GameCompleted-to-Leaderboard-{environment}`
- Event pattern:
  - Source: `game-service`
  - Detail type: `GameCompleted`
- Target: Leaderboard Service Lambda
- Retry policy:
  - Max retry attempts: 3
  - Max event age: 1 hour
- Dead letter queue: `leaderboard-dlq`

### 4. Game Events Archive

**Resource Name**: `GameEvents-Archive-{environment}`
**Purpose**: Archives all game events for debugging and replay

**Configuration**:
- Archive name: `GameEvents-Archive-dev` (for dev environment)
- Retention: 7 days
- Event pattern: Source = `game-service`

**CloudFormation Output**:
- `GameEventsArchiveName`: The archive name

### 5. CloudWatch Logs

**Resource Name**: `/aws/events/game-events-{environment}`
**Purpose**: Logs all game events for monitoring and debugging

**Configuration**:
- Log group name: `/aws/events/game-events-dev` (for dev environment)
- Retention: 7 days
- Removal policy: DESTROY (for dev environment)

## Event Schema

### GameCompleted Event

```json
{
  "version": "1.0",
  "source": "game-service",
  "detail-type": "GameCompleted",
  "detail": {
    "gameId": "uuid",
    "userId": "cognito-user-id",
    "username": "display-name",
    "gameType": "MEMORY_MATCH | MATH_CHALLENGE | WORD_PUZZLE | LANGUAGE_LEARNING",
    "difficulty": "EASY | MEDIUM | HARD | BEGINNER | INTERMEDIATE | ADVANCED",
    "completionTime": 45.5,
    "accuracy": 0.85,
    "performanceMetrics": {
      "attempts": 12,
      "correctAnswers": 8,
      "totalQuestions": 10,
      "wordsFound": 15,
      "totalWords": 20,
      "correctMatches": 9,
      "totalAttempts": 10,
      "pairs": 6
    },
    "timestamp": "2026-03-11T10:30:00.000Z"
  }
}
```

## Retry Policy

The EventBridge rule (to be created) will implement the following retry policy:

- **Maximum retry attempts**: 3
- **Maximum event age**: 1 hour
- **Backoff strategy**: Exponential (managed by EventBridge)
- **Dead letter queue**: Failed events after all retries are sent to `leaderboard-dlq`

## Error Handling

### Event Processing Failures

1. EventBridge automatically retries failed invocations up to 3 times
2. Exponential backoff between retries
3. After max retries, event is sent to `leaderboard-dlq`
4. CloudWatch alarms monitor DLQ depth (to be configured in Phase 7)

### Monitoring

- All events are logged to CloudWatch Logs: `/aws/events/game-events-{environment}`
- All events are archived for 7 days in `GameEvents-Archive-{environment}`
- Failed events are sent to `leaderboard-dlq-{environment}` for manual review

## Deployment

### Deploy EventBridge Stack

```bash
cd infrastructure
npm run build
npx cdk deploy MemoryGame-EventBridge-dev
```

### Verify Deployment

```bash
# Check event bus exists
aws events describe-event-bus --name game-events-dev

# Check DLQ exists
aws sqs get-queue-url --queue-name leaderboard-dlq-dev

# Check archive exists
aws events describe-archive --archive-name GameEvents-Archive-dev
```

## Next Steps

1. **Task 3.1**: Create Leaderboard Service Lambda (Phase 2)
2. **Task 3.2**: Create EventBridge rule using `LeaderboardEventRule` construct
3. **Task 12.2**: Modify Game Service to publish GameCompleted events
4. **Task 24**: Set up CloudWatch alarms for DLQ monitoring

## References

- Design Document: `.kiro/specs/leaderboard-and-scoring-system/design.md`
- Requirements Document: `.kiro/specs/leaderboard-and-scoring-system/requirements.md`
- Tasks Document: `.kiro/specs/leaderboard-and-scoring-system/tasks.md`
- EventBridge Stack: `infrastructure/lib/stacks/eventbridge-stack.ts`
- Leaderboard Event Rule Construct: `infrastructure/lib/constructs/leaderboard-event-rule.ts`
