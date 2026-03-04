# Integration Test Instructions

## Overview
Integration tests validate interactions between services and external dependencies (DynamoDB, Cognito, EventBridge).

## Purpose
- Test Auth Service ↔ Cognito integration
- Test Game Service ↔ DynamoDB integration
- Test Game Service ↔ EventBridge integration
- Test Auth Service ↔ DynamoDB integration
- Test cross-service communication

---

## Prerequisites

### Local Testing (Recommended for Development)

1. **LocalStack** (AWS services locally):
```bash
# Install LocalStack
pip install localstack

# Start LocalStack with required services
localstack start -d

# Services: DynamoDB, Cognito, EventBridge, Lambda
```

2. **AWS SAM CLI** (Lambda testing):
```bash
# Install SAM CLI
brew install aws-sam-cli  # macOS
# or follow: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

### AWS Testing (For Real Environment)

1. **AWS Account**: Development/staging account
2. **AWS CLI**: Configured with credentials
3. **Deployed Infrastructure**: CDK stacks deployed

---

## Test Scenarios

### Scenario 1: Auth Service ↔ Cognito Integration

**Description**: Test user registration, login, and token validation with Cognito

**Setup**:
```bash
# Option A: LocalStack
export COGNITO_USER_POOL_ID=local-pool-id
export COGNITO_CLIENT_ID=local-client-id
export AWS_ENDPOINT=http://localhost:4566

# Option B: AWS Dev Environment
export COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
export COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Test Steps**:
```bash
cd services/auth

# 1. Start Auth Service locally
npm run start:local

# 2. Test user registration
curl -X POST http://localhost:3000/auth/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(input: { email: \"test@example.com\", password: \"Test123!\", name: \"Test User\" }) { user { id email } accessToken } }"
  }'

# 3. Test user login
curl -X POST http://localhost:3000/auth/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"test@example.com\", password: \"Test123!\" }) { user { id email } accessToken } }"
  }'

# 4. Test token validation
curl -X POST http://localhost:3000/auth/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "query { me { id email name } }"
  }'
```

**Expected Results**:
- Registration returns user object and access token
- Login returns user object and access token
- Token validation returns user profile
- Invalid credentials return appropriate errors

**Cleanup**:
```bash
# Delete test user from Cognito
aws cognito-idp admin-delete-user \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username test@example.com
```

---

### Scenario 2: Game Service ↔ DynamoDB Integration

**Description**: Test game creation, completion, and history retrieval with DynamoDB

**Setup**:
```bash
# Option A: LocalStack
export GAMES_TABLE_NAME=Games-local
export RATE_LIMITS_TABLE_NAME=RateLimits-local
export ACHIEVEMENTS_TABLE_NAME=Achievements-local
export AWS_ENDPOINT=http://localhost:4566

# Option B: AWS Dev Environment
export GAMES_TABLE_NAME=memory-game-games-dev
export RATE_LIMITS_TABLE_NAME=memory-game-rate-limits-dev
export ACHIEVEMENTS_TABLE_NAME=memory-game-achievements-dev
```

**Test Steps**:
```bash
cd services/game

# 1. Start Game Service locally
npm run start:local

# 2. Test start game
curl -X POST http://localhost:3001/game/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "mutation { startGame(input: { themeId: \"theme-1\", difficulty: \"MEDIUM\" }) { id status canPlay } }"
  }'

# 3. Test complete game
curl -X POST http://localhost:3001/game/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "mutation { completeGame(input: { gameId: \"<GAME_ID>\", completionTime: 60, attempts: 5 }) { id score achievements { type unlocked } } }"
  }'

# 4. Test game history
curl -X POST http://localhost:3001/game/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "query { getGameHistory(input: { page: 1, pageSize: 10 }) { games { id score completedAt } pagination { total hasMore } } }"
  }'

# 5. Test user statistics
curl -X POST http://localhost:3001/game/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "query { getUserStatistics { totalGames averageScore bestScore } }"
  }'
```

**Expected Results**:
- Start game creates record in Games table
- Complete game updates record with score and achievements
- Game history returns paginated results
- User statistics return aggregated data
- Rate limiting enforces tier-based limits

**Cleanup**:
```bash
# Delete test game records
aws dynamodb delete-item \
  --table-name $GAMES_TABLE_NAME \
  --key '{"userId":{"S":"test-user-id"},"gameId":{"S":"test-game-id"}}'
```

---

### Scenario 3: Game Service ↔ EventBridge Integration

**Description**: Test event publishing when game is completed

**Setup**:
```bash
# Option A: LocalStack
export EVENT_BUS_NAME=MemoryGame-local
export AWS_ENDPOINT=http://localhost:4566

# Option B: AWS Dev Environment
export EVENT_BUS_NAME=MemoryGame-dev
```

**Test Steps**:
```bash
# 1. Subscribe to EventBridge events (for testing)
aws events put-rule \
  --name test-game-completed \
  --event-bus-name $EVENT_BUS_NAME \
  --event-pattern '{"source":["memory-game.game"],"detail-type":["GameCompleted"]}'

# 2. Add CloudWatch Logs target
aws events put-targets \
  --rule test-game-completed \
  --event-bus-name $EVENT_BUS_NAME \
  --targets "Id"="1","Arn"="arn:aws:logs:us-east-1:123456789012:log-group:/aws/events/test"

# 3. Complete a game (triggers event)
curl -X POST http://localhost:3001/game/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "mutation { completeGame(input: { gameId: \"<GAME_ID>\", completionTime: 60, attempts: 5 }) { id score } }"
  }'

# 4. Verify event was published
aws logs tail /aws/events/test --follow
```

**Expected Results**:
- GameCompleted event published to EventBridge
- Event contains userId, gameId, score, achievements
- Event appears in CloudWatch Logs

**Cleanup**:
```bash
# Remove test rule
aws events remove-targets --rule test-game-completed --ids 1
aws events delete-rule --name test-game-completed
```

---

### Scenario 4: Auth Service ↔ DynamoDB Integration

**Description**: Test user profile storage and retrieval

**Setup**:
```bash
export USERS_TABLE_NAME=memory-game-users-dev
export USER_SETTINGS_TABLE_NAME=memory-game-user-settings-dev
```

**Test Steps**:
```bash
# 1. Register user (creates DynamoDB record)
curl -X POST http://localhost:3000/auth/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(input: { email: \"test@example.com\", password: \"Test123!\", name: \"Test User\" }) { user { id } } }"
  }'

# 2. Verify user in DynamoDB
aws dynamodb get-item \
  --table-name $USERS_TABLE_NAME \
  --key '{"userId":{"S":"<USER_ID>"}}'

# 3. Update user profile
curl -X POST http://localhost:3000/auth/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "mutation { updateProfile(input: { name: \"Updated Name\" }) { id name } }"
  }'

# 4. Verify update in DynamoDB
aws dynamodb get-item \
  --table-name $USERS_TABLE_NAME \
  --key '{"userId":{"S":"<USER_ID>"}}'
```

**Expected Results**:
- User registration creates record in Users table
- User profile updates are persisted to DynamoDB
- Email index allows lookup by email
- Cognito ID index allows lookup by Cognito user

---

## Run Integration Tests (Automated)

### Using Jest Integration Tests (When Implemented)

```bash
# Auth Service
cd services/auth
npm run test:integration

# Game Service
cd services/game
npm run test:integration
```

### Using Postman/Newman

```bash
# Install Newman
npm install -g newman

# Run Postman collection
newman run integration-tests.postman_collection.json \
  --environment dev.postman_environment.json
```

---

## Setup Integration Test Environment

### Option 1: LocalStack (Local Development)

```bash
# Start LocalStack
docker run -d \
  --name localstack \
  -p 4566:4566 \
  -e SERVICES=dynamodb,cognito-idp,events,lambda \
  localstack/localstack

# Create test tables
aws dynamodb create-table \
  --table-name Games-local \
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=gameId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=gameId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:4566

# Create test Cognito pool
aws cognito-idp create-user-pool \
  --pool-name test-pool \
  --endpoint-url http://localhost:4566
```

### Option 2: AWS Dev Environment

```bash
# Deploy infrastructure to dev
cd infrastructure
npm run deploy:dev

# Note the output values (API URLs, table names, etc.)
```

---

## Verify Service Interactions

### Check CloudWatch Logs

```bash
# Auth Service logs
aws logs tail /aws/lambda/MemoryGame-AuthService-dev --follow

# Game Service logs
aws logs tail /aws/lambda/MemoryGame-GameService-dev --follow

# API Gateway logs
aws logs tail /aws/apigateway/memory-game-dev --follow
```

### Check DynamoDB Tables

```bash
# List items in Games table
aws dynamodb scan --table-name memory-game-games-dev --max-items 10

# Query user's games
aws dynamodb query \
  --table-name memory-game-games-dev \
  --key-condition-expression "userId = :userId" \
  --expression-attribute-values '{":userId":{"S":"test-user-id"}}'
```

### Check EventBridge Events

```bash
# View event archive
aws events list-archives --event-source-arn arn:aws:events:us-east-1:123456789012:event-bus/MemoryGame-dev

# Replay events (for testing)
aws events start-replay \
  --replay-name test-replay \
  --event-source-arn arn:aws:events:us-east-1:123456789012:event-bus/MemoryGame-dev \
  --event-start-time 2026-03-03T00:00:00Z \
  --event-end-time 2026-03-03T23:59:59Z \
  --destination '{"Arn":"arn:aws:events:us-east-1:123456789012:event-bus/MemoryGame-dev"}'
```

---

## Cleanup

### LocalStack

```bash
# Stop and remove LocalStack
docker stop localstack
docker rm localstack
```

### AWS Dev Environment

```bash
# Delete test data
aws dynamodb delete-item --table-name memory-game-games-dev --key '{"userId":{"S":"test-user"},"gameId":{"S":"test-game"}}'

# Or destroy entire dev environment
cd infrastructure
npm run destroy:dev
```

---

## Troubleshooting

### Service Cannot Connect to DynamoDB

**Solution**:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check table exists
aws dynamodb describe-table --table-name memory-game-games-dev

# Check IAM permissions
aws iam get-role-policy --role-name MemoryGame-GameService-dev --policy-name DynamoDBAccess
```

### Cognito Authentication Fails

**Solution**:
```bash
# Verify User Pool exists
aws cognito-idp describe-user-pool --user-pool-id $COGNITO_USER_POOL_ID

# Check User Pool Client
aws cognito-idp describe-user-pool-client \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --client-id $COGNITO_CLIENT_ID
```

### Events Not Published to EventBridge

**Solution**:
```bash
# Check EventBridge permissions
aws events describe-event-bus --name MemoryGame-dev

# Check Lambda has PutEvents permission
aws lambda get-policy --function-name MemoryGame-GameService-dev
```

---

## Integration Test Status

### ⏳ Pending Implementation
- Automated integration test suites (Jest)
- Postman collections
- Contract tests between services

### ✅ Manual Testing Available
- All scenarios can be tested manually using curl commands above
- CloudWatch Logs available for debugging
- AWS Console for verifying data

---

## Next Steps

1. Deploy infrastructure: `cd infrastructure && npm run deploy:dev`
2. Run manual integration tests using curl commands above
3. Verify service interactions in CloudWatch Logs
4. Proceed to performance testing (see `performance-test-instructions.md`)
