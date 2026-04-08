# Leaderboard System Testing Guide

## Overview

This guide walks you through testing the complete leaderboard and scoring system, from backend services to frontend components.

## Prerequisites

Before testing, ensure you have:
- AWS credentials configured
- Node.js and npm installed
- Access to the deployed infrastructure
- A test user account in Cognito

## Testing Checklist

### Phase 1: Backend Unit Tests ✅

These tests are already written and passing.

```bash
# Test Leaderboard Service
cd services/leaderboard
npm install
npm test

# Expected output:
# - Scoring Service tests (all formulas)
# - Leaderboard Repository tests
# - Aggregate Repository tests
# - Leaderboard Service tests
# - Anomaly Detection tests
# - Auth and Rate Limiting tests
# - Event Handler tests
# - GraphQL Handler tests
```

```bash
# Test Game Service Event Publishing
cd services/game
npm install
npm test

# Expected output:
# - Event Publisher Service tests
# - Event Flow Integration tests
```

### Phase 2: Infrastructure Deployment

#### Step 1: Deploy Infrastructure

```bash
# From project root
cd infrastructure

# Install dependencies
npm install

# Deploy all stacks
npm run deploy

# Or deploy specific stacks
cdk deploy DatabaseStack
cdk deploy EventBridgeStack
cdk deploy LeaderboardLambdaStack
cdk deploy ApiStack
```

#### Step 2: Verify Infrastructure

```bash
# Check DynamoDB tables exist
aws dynamodb list-tables | grep -E "LeaderboardEntries|UserAggregates|RateLimitBuckets"

# Check EventBridge event bus
aws events list-event-buses | grep game-events

# Check Lambda functions
aws lambda list-functions | grep -E "LeaderboardService|GameService"

# Check API Gateway
aws apigatewayv2 get-apis
```

### Phase 3: Backend Integration Testing

#### Test 1: Event Publishing (Game Service → EventBridge)

```bash
# Create a test event payload
cat > test-game-completed.json << 'EOF'
{
  "gameId": "test-game-123",
  "userId": "test-user-456",
  "userName": "TestUser",
  "themeId": "ANIMALS",
  "difficulty": 3,
  "score": 850,
  "completionTime": 45,
  "attempts": 12,
  "completedAt": "2024-03-11T12:00:00Z"
}
EOF

# Publish test event to EventBridge
aws events put-events \
  --entries '[{
    "Source": "game-service",
    "DetailType": "GameCompleted",
    "Detail": "'"$(cat test-game-completed.json)"'",
    "EventBusName": "game-events"
  }]'

# Check CloudWatch Logs for Leaderboard Service
aws logs tail /aws/lambda/leaderboard-service-dev --follow
```

#### Test 2: Direct Lambda Invocation (Leaderboard Service)

```bash
# Test GraphQL getLeaderboard query
cat > test-leaderboard-query.json << 'EOF'
{
  "body": "{\"query\":\"query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME, limit: 10) { entries { rank userId username score } totalEntries } }\"}",
  "headers": {
    "authorization": "Bearer YOUR_JWT_TOKEN_HERE"
  }
}
EOF

# Invoke Lambda directly
aws lambda invoke \
  --function-name MemoryGame-LeaderboardService-dev \
  --payload file://test-leaderboard-query.json \
  response.json

# View response
cat response.json | jq
```

#### Test 3: API Gateway Testing

```bash
# Get API Gateway URL
export API_URL=$(aws cloudformation describe-stacks \
  --stack-name ApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LeaderboardEndpoint`].OutputValue' \
  --output text)

echo "Leaderboard Endpoint: $API_URL"

# Test with curl (requires valid JWT token)
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "query": "query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME, limit: 10) { entries { rank username score } totalEntries } }"
  }' | jq
```

### Phase 4: Frontend Testing

#### Step 1: Configure Environment Variables

```bash
cd apps/web

# Create or update .env.local
cat > .env.local << 'EOF'
# API Endpoints
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/auth/graphql
VITE_GAME_ENDPOINT=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/game/graphql
VITE_LEADERBOARD_ENDPOINT=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/leaderboard/graphql

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_REGION=us-east-1
EOF
```

#### Step 2: Start Frontend Development Server

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Server should start at http://localhost:3000
```

#### Step 3: Manual Frontend Testing

**Test Scenario 1: Leaderboard Page**

1. Navigate to http://localhost:3000
2. Log in with test credentials
3. Click "🏆 Leaderboard" in navigation
4. **Verify**:
   - [ ] Page loads without errors
   - [ ] Timeframe selector displays (Daily, Weekly, Monthly, All Time)
   - [ ] Game type filter displays
   - [ ] Loading spinner shows while fetching
   - [ ] Leaderboard table displays with data
   - [ ] Current user is highlighted (if ranked)
   - [ ] Medal icons show for top 3
   - [ ] Responsive design works (resize browser)

**Test Scenario 2: Dashboard Widgets**

1. Navigate to Dashboard
2. Scroll to "Your Performance" section
3. **Verify**:
   - [ ] LeaderboardRankWidget shows your rank
   - [ ] ScoreTrendsChart displays bar chart
   - [ ] RecentImprovements shows improvements
   - [ ] All widgets have loading states
   - [ ] Clicking widgets navigates to leaderboard
   - [ ] Empty states show if no data

**Test Scenario 3: Game Completion Flow**

1. Navigate to Game Hub
2. Select Memory Match game
3. Choose difficulty and start game
4. Complete the game
5. **Verify**:
   - [ ] ScoreBreakdownModal appears
   - [ ] Final score displays prominently
   - [ ] Score breakdown table shows all components
   - [ ] Leaderboard rank badge displays (if ranked)
   - [ ] Rank badge has correct color
   - [ ] "View Leaderboard" button works
   - [ ] "Play Again" button works
   - [ ] Modal can be closed

**Test Scenario 4: Filtering and Navigation**

1. On Leaderboard page, test filters:
   - [ ] Change timeframe (Daily → Weekly → Monthly → All Time)
   - [ ] Change game type (Overall → Memory Match → Math Challenge)
   - [ ] Data updates correctly for each filter
   - [ ] Loading state shows during fetch
   - [ ] URL doesn't change (client-side filtering)

2. Test navigation:
   - [ ] Header link to leaderboard works
   - [ ] Dashboard card link works
   - [ ] Widget links work
   - [ ] Score breakdown modal link works
   - [ ] Back button works correctly

### Phase 5: End-to-End Testing

#### Complete User Journey Test

```bash
# This tests the entire flow from game completion to leaderboard display
```

1. **Setup**: Create a fresh test user
   ```bash
   # Create test user in Cognito
   aws cognito-idp admin-create-user \
     --user-pool-id YOUR_USER_POOL_ID \
     --username testuser@example.com \
     --temporary-password TempPass123! \
     --user-attributes Name=email,Value=testuser@example.com
   ```

2. **Play Game**:
   - Log in as test user
   - Play Memory Match game (Easy difficulty)
   - Complete game quickly (< 30 seconds)
   - Note the score displayed

3. **Verify Event Flow**:
   ```bash
   # Check EventBridge received event
   aws logs filter-log-events \
     --log-group-name /aws/lambda/game-service-dev \
     --filter-pattern "GameCompleted event published"
   
   # Check Leaderboard Service processed event
   aws logs filter-log-events \
     --log-group-name /aws/lambda/leaderboard-service-dev \
     --filter-pattern "Processing GameCompleted event"
   ```

4. **Verify Database**:
   ```bash
   # Check LeaderboardEntries table
   aws dynamodb scan \
     --table-name LeaderboardEntries-dev \
     --filter-expression "userId = :uid" \
     --expression-attribute-values '{":uid":{"S":"test-user-id"}}' \
     --limit 5
   
   # Check UserAggregates table
   aws dynamodb get-item \
     --table-name UserAggregates-dev \
     --key '{"userId":{"S":"test-user-id"},"gameType":{"S":"OVERALL"}}'
   ```

5. **Verify Frontend**:
   - Refresh leaderboard page
   - Verify test user appears in rankings
   - Check dashboard widgets update
   - Verify rank badge shows in next game completion

### Phase 6: Performance Testing

#### Load Test Script

```bash
# Install Artillery (if not installed)
npm install -g artillery

# Create load test configuration
cat > artillery-leaderboard.yml << 'EOF'
config:
  target: "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
  variables:
    jwtToken: "YOUR_JWT_TOKEN_HERE"

scenarios:
  - name: "Get Leaderboard"
    flow:
      - post:
          url: "/leaderboard/graphql"
          headers:
            Content-Type: "application/json"
            Authorization: "Bearer {{ jwtToken }}"
          json:
            query: "query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME, limit: 100) { entries { rank username score } totalEntries } }"
EOF

# Run load test
artillery run artillery-leaderboard.yml
```

#### Expected Performance Metrics

- **p95 latency**: < 200ms
- **p99 latency**: < 500ms
- **Error rate**: < 1%
- **Throughput**: > 100 requests/second

### Phase 7: Error Handling Testing

#### Test Error Scenarios

1. **Invalid JWT Token**:
   ```bash
   curl -X POST $API_URL \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer invalid-token" \
     -d '{"query":"query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME) { entries { rank } } }"}' | jq
   
   # Expected: 401 Unauthorized
   ```

2. **Rate Limiting**:
   ```bash
   # Make 20 rapid requests
   for i in {1..20}; do
     curl -X POST $API_URL \
       -H "Authorization: Bearer $JWT_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"query":"query { getLeaderboard(gameType: OVERALL, timeframe: ALL_TIME) { entries { rank } } }"}' &
   done
   wait
   
   # Expected: Some requests return 429 Too Many Requests
   ```

3. **Invalid Query**:
   ```bash
   curl -X POST $API_URL \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query":"query { invalidQuery { field } }"}' | jq
   
   # Expected: GraphQL error response
   ```

4. **Network Timeout** (Frontend):
   - Open browser DevTools → Network tab
   - Throttle network to "Slow 3G"
   - Navigate to leaderboard
   - Verify loading state shows
   - Verify error message if timeout occurs

### Phase 8: Browser Testing

Test in multiple browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

For each browser, verify:
- [ ] Leaderboard page renders correctly
- [ ] Modals display properly
- [ ] Animations work smoothly
- [ ] No console errors
- [ ] Responsive design works

### Phase 9: Accessibility Testing

```bash
# Install axe-core CLI
npm install -g @axe-core/cli

# Run accessibility audit
axe http://localhost:3000/leaderboard --save results.json

# Review results
cat results.json | jq '.violations'
```

Manual accessibility checks:
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are visible
- [ ] ARIA labels are present

### Phase 10: Monitoring and Observability

#### Set Up CloudWatch Dashboard

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name LeaderboardMetrics \
  --dashboard-body file://cloudwatch-dashboard.json
```

#### Monitor Key Metrics

1. **Lambda Metrics**:
   - Invocations
   - Duration
   - Errors
   - Throttles

2. **DynamoDB Metrics**:
   - Read/Write capacity units
   - Throttled requests
   - System errors

3. **API Gateway Metrics**:
   - Request count
   - Latency (p50, p95, p99)
   - 4xx/5xx errors

4. **Custom Metrics**:
   - LeaderboardQueryLatency
   - ScoreCalculationErrors
   - AnomalyDetectionRate

## Troubleshooting

### Common Issues

**Issue 1: "Failed to fetch leaderboard"**
- Check API Gateway URL in .env.local
- Verify JWT token is valid
- Check CORS configuration
- Review CloudWatch logs

**Issue 2: "Score breakdown not showing"**
- Verify Game Service is publishing events
- Check EventBridge rule is active
- Verify Leaderboard Service is processing events
- Check DynamoDB tables have data

**Issue 3: "Current user not highlighted"**
- Verify userId matches between Cognito and leaderboard
- Check isCurrentUser flag in API response
- Review frontend logic in LeaderboardRow component

**Issue 4: "Widgets showing empty state"**
- Play at least one game to generate data
- Check API responses in Network tab
- Verify GraphQL queries are correct
- Review error messages in console

### Debug Commands

```bash
# View Lambda logs
aws logs tail /aws/lambda/leaderboard-service-dev --follow

# Check DynamoDB table contents
aws dynamodb scan --table-name LeaderboardEntries-dev --limit 10

# Test EventBridge rule
aws events test-event-pattern \
  --event-pattern '{"source":["game-service"],"detail-type":["GameCompleted"]}' \
  --event '{"source":"game-service","detail-type":"GameCompleted"}'

# Check API Gateway logs
aws logs tail /aws/apigateway/memory-game-dev --follow
```

## Success Criteria

The leaderboard system is working correctly when:

- [x] All unit tests pass
- [x] Infrastructure deploys successfully
- [x] Events flow from Game Service → EventBridge → Leaderboard Service
- [x] Leaderboard data is stored in DynamoDB
- [x] API Gateway routes requests correctly
- [x] Frontend displays leaderboard data
- [x] Dashboard widgets show user performance
- [x] Score breakdown modal appears after game completion
- [x] Current user is highlighted in leaderboard
- [x] Filtering and navigation work correctly
- [x] Performance meets SLA (p95 < 200ms)
- [x] Error handling works as expected
- [x] Responsive design works on all devices
- [x] Accessibility standards are met

## Next Steps

After successful testing:

1. Deploy to staging environment
2. Run full regression tests
3. Perform user acceptance testing
4. Deploy to production with feature flags
5. Monitor metrics and user feedback
6. Iterate based on findings

## Support

If you encounter issues:
1. Check CloudWatch logs
2. Review this testing guide
3. Consult the design document
4. Check the troubleshooting section
5. Create a support ticket with logs and screenshots
