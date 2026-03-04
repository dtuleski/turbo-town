# Performance Test Instructions

## Overview
Performance tests validate that the system meets response time, throughput, and scalability requirements under load.

## Performance Requirements

### Response Time Targets
- **Auth Service**:
  - Login/Register: < 500ms (p95)
  - Token validation: < 100ms (p95)
  - Profile operations: < 300ms (p95)

- **Game Service**:
  - Start game: < 300ms (p95)
  - Complete game: < 500ms (p95)
  - Get history: < 400ms (p95)
  - Get statistics: < 200ms (p95)

### Throughput Targets
- **API Gateway**: 200 requests/second steady state, 500 burst
- **Auth Service**: 100 requests/second
- **Game Service**: 150 requests/second

### Scalability Targets
- **Concurrent Users**: Support 1,000 concurrent users
- **Daily Active Users**: Support 10,000 DAU
- **Peak Load**: Handle 3x normal load during peak hours

### Error Rate Target
- **Overall**: < 0.1% error rate under normal load
- **Under Stress**: < 1% error rate at 2x capacity

---

## Performance Testing Tools

### Recommended Tools

1. **Artillery** (Node.js-based, easy to use):
```bash
npm install -g artillery
```

2. **k6** (Go-based, powerful):
```bash
brew install k6  # macOS
# or: https://k6.io/docs/getting-started/installation/
```

3. **Apache JMeter** (Java-based, GUI):
- Download from: https://jmeter.apache.org/

4. **AWS Load Testing** (Distributed Load Testing on AWS):
- CloudFormation template available

---

## Setup Performance Test Environment

### 1. Deploy to Staging Environment

```bash
cd infrastructure
npm run deploy:staging
```

**Note**: Never run performance tests against production!

### 2. Configure Test Parameters

Create `performance-tests/config.yml`:

```yaml
target: https://API_GATEWAY_URL
phases:
  - duration: 60
    arrivalRate: 10
    name: "Warm up"
  - duration: 300
    arrivalRate: 50
    name: "Sustained load"
  - duration: 120
    arrivalRate: 100
    name: "Peak load"
  - duration: 60
    arrivalRate: 10
    name: "Cool down"
```

### 3. Prepare Test Data

```bash
# Create test users
for i in {1..100}; do
  curl -X POST $API_URL/auth/graphql \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"mutation { register(input: { email: \\\"test$i@example.com\\\", password: \\\"Test123!\\\", name: \\\"Test User $i\\\" }) { user { id } accessToken } }\"}"
done

# Store access tokens for load testing
```

---

## Performance Test Scenarios

### Scenario 1: Auth Service Load Test

**Test**: Simulate 100 concurrent users logging in

**Artillery Script** (`auth-load-test.yml`):

```yaml
config:
  target: "https://API_GATEWAY_URL"
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 300
      arrivalRate: 50
    - duration: 60
      arrivalRate: 10
  processor: "./auth-processor.js"

scenarios:
  - name: "User Login Flow"
    flow:
      - post:
          url: "/auth/graphql"
          json:
            query: |
              mutation {
                login(input: {
                  email: "{{ email }}"
                  password: "Test123!"
                }) {
                  user { id email }
                  accessToken
                }
              }
          capture:
            - json: "$.data.login.accessToken"
              as: "accessToken"
      - post:
          url: "/auth/graphql"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          json:
            query: |
              query {
                me {
                  id
                  email
                  name
                }
              }
```

**Run Test**:
```bash
artillery run auth-load-test.yml --output auth-results.json
artillery report auth-results.json
```

**Expected Results**:
- p95 response time < 500ms
- Error rate < 0.1%
- Throughput: 50 req/s sustained

---

### Scenario 2: Game Service Load Test

**Test**: Simulate 150 concurrent users playing games

**Artillery Script** (`game-load-test.yml`):

```yaml
config:
  target: "https://API_GATEWAY_URL"
  phases:
    - duration: 60
      arrivalRate: 15
    - duration: 300
      arrivalRate: 75
    - duration: 60
      arrivalRate: 15

scenarios:
  - name: "Play Game Flow"
    flow:
      # Start game
      - post:
          url: "/game/graphql"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          json:
            query: |
              mutation {
                startGame(input: {
                  themeId: "theme-1"
                  difficulty: "MEDIUM"
                }) {
                  id
                  status
                }
              }
          capture:
            - json: "$.data.startGame.id"
              as: "gameId"
      
      # Simulate gameplay (wait 30-120 seconds)
      - think: 60
      
      # Complete game
      - post:
          url: "/game/graphql"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          json:
            query: |
              mutation {
                completeGame(input: {
                  gameId: "{{ gameId }}"
                  completionTime: 60
                  attempts: 5
                }) {
                  id
                  score
                  achievements { type unlocked }
                }
              }
      
      # Get statistics
      - post:
          url: "/game/graphql"
          headers:
            Authorization: "Bearer {{ accessToken }}"
          json:
            query: |
              query {
                getUserStatistics {
                  totalGames
                  averageScore
                  bestScore
                }
              }
```

**Run Test**:
```bash
artillery run game-load-test.yml --output game-results.json
artillery report game-results.json
```

**Expected Results**:
- Start game p95 < 300ms
- Complete game p95 < 500ms
- Get statistics p95 < 200ms
- Error rate < 0.1%
- Throughput: 75 req/s sustained

---

### Scenario 3: Stress Test (Find Breaking Point)

**Test**: Gradually increase load until system fails

**k6 Script** (`stress-test.js`):

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 300 },   // Ramp up to 300 users
    { duration: '5m', target: 300 },   // Stay at 300 users
    { duration: '2m', target: 400 },   // Ramp up to 400 users
    { duration: '5m', target: 400 },   // Stay at 400 users
    { duration: '5m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

const API_URL = 'https://API_GATEWAY_URL';
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

export default function () {
  // Start game
  let startGameRes = http.post(
    `${API_URL}/game/graphql`,
    JSON.stringify({
      query: `mutation {
        startGame(input: { themeId: "theme-1", difficulty: "MEDIUM" }) {
          id status
        }
      }`
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    }
  );

  check(startGameRes, {
    'start game status is 200': (r) => r.status === 200,
    'start game response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run Test**:
```bash
k6 run stress-test.js
```

**Expected Results**:
- Identify breaking point (e.g., 350 concurrent users)
- Observe degradation patterns
- Identify bottlenecks (Lambda throttling, DynamoDB throttling, API Gateway limits)

---

### Scenario 4: Spike Test (Sudden Traffic Surge)

**Test**: Simulate sudden traffic spike (e.g., viral event)

**k6 Script** (`spike-test.js`):

```javascript
export let options = {
  stages: [
    { duration: '1m', target: 50 },    // Normal load
    { duration: '30s', target: 500 },  // Sudden spike
    { duration: '3m', target: 500 },   // Sustained spike
    { duration: '1m', target: 50 },    // Return to normal
    { duration: '1m', target: 0 },     // Ramp down
  ],
};

// Same test logic as stress test
```

**Run Test**:
```bash
k6 run spike-test.js
```

**Expected Results**:
- System handles spike without errors
- Auto-scaling responds within 2 minutes
- Response times remain acceptable (< 1s p95)

---

## Analyze Performance Results

### Artillery Reports

```bash
# Generate HTML report
artillery report results.json --output report.html
open report.html
```

**Key Metrics**:
- **Response Time**: p50, p95, p99
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Latency Distribution**: Histogram of response times

### k6 Results

k6 outputs results to console:

```
http_req_duration..............: avg=245ms min=120ms med=230ms max=890ms p(90)=350ms p(95)=450ms
http_req_failed................: 0.05% ✓ 15 ✗ 29985
http_reqs......................: 30000 100/s
```

### CloudWatch Metrics

```bash
# Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=MemoryGame-GameService-staging \
  --start-time 2026-03-03T12:00:00Z \
  --end-time 2026-03-03T13:00:00Z \
  --period 300 \
  --statistics Average,Maximum

# API Gateway latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiId,Value=YOUR_API_ID \
  --start-time 2026-03-03T12:00:00Z \
  --end-time 2026-03-03T13:00:00Z \
  --period 300 \
  --statistics Average,Maximum

# DynamoDB throttles
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=memory-game-games-staging \
  --start-time 2026-03-03T12:00:00Z \
  --end-time 2026-03-03T13:00:00Z \
  --period 300 \
  --statistics Sum
```

---

## Performance Optimization

### If Response Times Exceed Targets

**Potential Bottlenecks**:

1. **Lambda Cold Starts**:
   - Solution: Enable provisioned concurrency
   - Solution: Increase memory (faster CPU)
   - Solution: Optimize bundle size

2. **DynamoDB Latency**:
   - Solution: Use DAX (DynamoDB Accelerator) for caching
   - Solution: Optimize query patterns
   - Solution: Add GSIs for common queries

3. **API Gateway Latency**:
   - Solution: Enable caching
   - Solution: Optimize payload size
   - Solution: Use HTTP API instead of REST API (already done)

4. **Network Latency**:
   - Solution: Deploy to multiple regions
   - Solution: Use CloudFront for API caching

### If Throughput Below Targets

**Solutions**:

1. **Increase Lambda Concurrency**:
```bash
aws lambda put-function-concurrency \
  --function-name MemoryGame-GameService-staging \
  --reserved-concurrent-executions 500
```

2. **Increase API Gateway Throttle Limits**:
```typescript
// In api-stack.ts
defaultRouteSettings: {
  throttlingBurstLimit: 1000,
  throttlingRateLimit: 500,
}
```

3. **Optimize DynamoDB**:
   - Switch to provisioned capacity for predictable workloads
   - Enable auto-scaling

### If Error Rate Exceeds Target

**Common Causes**:

1. **Lambda Throttling**: Increase concurrency limits
2. **DynamoDB Throttling**: Increase capacity or use on-demand
3. **API Gateway Throttling**: Increase throttle limits
4. **Application Errors**: Fix bugs in code

---

## Performance Test Status

### ⏳ Pending Implementation
- Artillery test scripts
- k6 test scripts
- Automated performance test suite
- Performance regression tests

### ✅ Manual Testing Available
- Can run manual load tests using Artillery or k6
- CloudWatch metrics available for analysis
- Can monitor performance in real-time

---

## Performance Benchmarks (Expected)

Based on serverless architecture:

| Metric | Target | Expected (Optimized) |
|--------|--------|---------------------|
| Auth Login (p95) | < 500ms | 250-350ms |
| Start Game (p95) | < 300ms | 150-250ms |
| Complete Game (p95) | < 500ms | 300-400ms |
| Get Statistics (p95) | < 200ms | 100-150ms |
| Throughput | 200 req/s | 500+ req/s |
| Concurrent Users | 1,000 | 2,000+ |
| Error Rate | < 0.1% | < 0.05% |

---

## Next Steps

1. Deploy to staging: `cd infrastructure && npm run deploy:staging`
2. Install performance testing tools: `npm install -g artillery` or `brew install k6`
3. Create test scripts based on examples above
4. Run load tests and analyze results
5. Optimize based on findings
6. Rerun tests to validate improvements

---

## Troubleshooting

### High Lambda Duration

**Solution**:
```bash
# Increase memory (also increases CPU)
aws lambda update-function-configuration \
  --function-name MemoryGame-GameService-staging \
  --memory-size 2048
```

### DynamoDB Throttling

**Solution**:
```bash
# Check throttle events
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=memory-game-games-staging \
  --start-time 2026-03-03T12:00:00Z \
  --end-time 2026-03-03T13:00:00Z \
  --period 60 \
  --statistics Sum

# Increase capacity or ensure on-demand mode
```

### API Gateway 429 Errors

**Solution**:
- Increase throttle limits in CDK stack
- Implement client-side retry with exponential backoff
- Use API Gateway usage plans for different tiers
