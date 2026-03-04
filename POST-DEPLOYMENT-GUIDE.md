# Post-Deployment Guide

## What to Do After Successful Deployment

Congratulations! Your backend is deployed. Here's what to do next.

## Immediate Testing (15-20 minutes)

### 1. Test User Registration
```
1. Open http://localhost:3000
2. Click "Register"
3. Fill in:
   - Email: your-email@example.com
   - Username: testuser
   - Password: Test123!@#
4. Submit
5. Check your email for verification code
6. Enter verification code
7. ✅ Should see "Email verified successfully"
```

### 2. Test Login
```
1. Go to login page
2. Enter your email and password
3. Click "Login"
4. ✅ Should redirect to dashboard
5. ✅ Should see your username in header
```

### 3. Test Game Play
```
1. Click "Play Game"
2. Select theme (e.g., "Shapes")
3. Select difficulty (e.g., "Easy")
4. Click "Start Game"
5. Play the game (match all pairs)
6. ✅ Should see completion screen with score
7. ✅ Should see confetti animation
```

### 4. Test Game History
```
1. Go to "Profile" or "Game History"
2. ✅ Should see the game you just played
3. ✅ Should show correct score, time, attempts
```

### 5. Verify Data in AWS
```bash
# Check if game was saved to DynamoDB
aws dynamodb scan \
  --table-name MemoryGame-Games-dev \
  --limit 5

# Check if user exists in Cognito
aws cognito-idp list-users \
  --user-pool-id YOUR_USER_POOL_ID \
  --limit 5
```

## Troubleshooting Common Issues

### Issue: "Email not received"
**Cause**: Cognito email verification delay or spam folder

**Solution**:
1. Check spam/junk folder
2. Wait 2-3 minutes (Cognito can be slow)
3. Request new verification code
4. Check AWS SES sandbox limits (if using SES)

### Issue: "CORS error in browser console"
**Cause**: API not configured for localhost origin

**Solution**:
```bash
# Check AppSync API settings in AWS Console
# Go to: AppSync → Your API → Settings → CORS
# Should allow: http://localhost:3000
```

### Issue: "401 Unauthorized"
**Cause**: JWT token not being sent or expired

**Solution**:
1. Check browser DevTools → Application → Local Storage
2. Should see auth token
3. Try logout and login again
4. Check token expiration (default: 1 hour)

### Issue: "Game doesn't save"
**Cause**: Lambda function error or DynamoDB permissions

**Solution**:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/MemoryGame-Game-dev --follow

# Look for errors like:
# - "AccessDeniedException" → IAM permissions issue
# - "ValidationException" → Data format issue
# - "ResourceNotFoundException" → Table doesn't exist
```

### Issue: "Rate limit not working"
**Cause**: Rate limit table not populated or logic error

**Solution**:
1. Play 4 games quickly (free tier limit is 3/24h)
2. Should see "Rate limit exceeded" message
3. If not, check Lambda logs for rate limit logic

## Verify Everything Works

### Checklist
- [ ] User registration works
- [ ] Email verification works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works (if implemented)
- [ ] Game starts successfully
- [ ] Game saves to database
- [ ] Game history shows saved games
- [ ] Rate limiting works (try 4 games)
- [ ] No errors in browser console
- [ ] No errors in CloudWatch logs

## Monitor Your Deployment

### CloudWatch Dashboards
```bash
# View Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=MemoryGame-Auth-dev \
  --start-time 2026-03-03T00:00:00Z \
  --end-time 2026-03-03T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### Check Costs
```bash
# View current month costs
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-03-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Set Up Billing Alerts
1. Go to AWS Console → Billing → Budgets
2. Create budget: $10/month
3. Set alert at 80% ($8)
4. Enter your email

## Optimize Your Deployment

### 1. Enable CloudWatch Insights
```bash
# Query Lambda logs
aws logs start-query \
  --log-group-name /aws/lambda/MemoryGame-Auth-dev \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc'
```

### 2. Set Up Alarms
Already done by Monitoring Stack, but verify:
- Lambda errors > 5 in 5 minutes
- Lambda duration > 3 seconds
- DynamoDB throttles > 0
- API Gateway 5xx errors > 10

### 3. Enable X-Ray Tracing (Optional)
```bash
# Update Lambda functions to enable X-Ray
aws lambda update-function-configuration \
  --function-name MemoryGame-Auth-dev \
  --tracing-config Mode=Active
```

## Update Frontend for Production

### 1. Add Error Handling
```typescript
// apps/web/src/utils/error-handler.ts
export const handleApiError = (error: any) => {
  if (error.code === 'NetworkError') {
    return 'Network error. Please check your connection.'
  }
  if (error.code === 'UnauthorizedException') {
    return 'Session expired. Please login again.'
  }
  return error.message || 'An error occurred'
}
```

### 2. Add Loading States
```typescript
// Show loading spinner during API calls
const [isLoading, setIsLoading] = useState(false)

const handleStartGame = async () => {
  setIsLoading(true)
  try {
    await startGame(...)
  } finally {
    setIsLoading(false)
  }
}
```

### 3. Add Retry Logic
```typescript
// Retry failed API calls
const retryApiCall = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

## Build Remaining Features

Now that your core backend is working, you can build:

### 1. Leaderboard Service (2-3 days)
- View top players
- Filter by theme/difficulty
- User rank calculation
- Time period filters (daily, weekly, monthly)

### 2. Payment Service (4-5 days)
- Stripe integration
- Subscription tiers (Light, Standard, Premium)
- Payment method management
- Billing history

### 3. CMS Service (3-4 days)
- Theme creation and editing
- Image uploads to S3
- Theme publishing workflow
- Category management

### 4. Admin Service (3-4 days)
- User management
- Subscription management
- Analytics dashboard
- Audit logs

### 5. Admin Dashboard (5-7 days)
- Separate React app
- User search and management
- Theme management UI
- Analytics charts

## Deploy to Production

When ready for production:

### 1. Create Production Environment
```bash
# Deploy to production
./deploy-backend.sh prod

# Configure frontend for production
# Edit apps/web/.env.production
VITE_API_URL=https://api.yourdomain.com/graphql
VITE_COGNITO_USER_POOL_ID=us-east-1_PROD_POOL_ID
VITE_COGNITO_CLIENT_ID=PROD_CLIENT_ID
VITE_COGNITO_REGION=us-east-1
VITE_ENV=production
```

### 2. Set Up Custom Domain
```bash
# Register domain (e.g., memorygame.com)
# Set up Route53 hosted zone
# Create SSL certificate in ACM
# Configure CloudFront distribution
# Point domain to CloudFront
```

### 3. Configure Production Settings
- Increase rate limits for paid tiers
- Enable CloudWatch detailed monitoring
- Set up SNS alerts for critical errors
- Configure backup retention (7-30 days)
- Enable DynamoDB point-in-time recovery

### 4. Security Hardening
- Enable AWS WAF on API Gateway
- Set up AWS Shield for DDoS protection
- Enable GuardDuty for threat detection
- Configure AWS Config for compliance
- Set up CloudTrail for audit logging

## Set Up CI/CD

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd packages/shared && npm install
          cd ../../services/auth && npm install
          cd ../game && npm install
          cd ../../infrastructure && npm install
      
      - name: Build services
        run: |
          cd packages/shared && npm run build
          cd ../../services/auth && npm run build
          cd ../game && npm run build
      
      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          cd infrastructure
          npm run cdk deploy -- --all --require-approval never
```

## Performance Optimization

### 1. Enable DynamoDB Auto Scaling
```bash
# Set up auto scaling for tables
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/MemoryGame-Games-prod \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100
```

### 2. Add Caching
- Enable AppSync caching (TTL: 5 minutes)
- Add CloudFront in front of AppSync
- Use DynamoDB DAX for hot data

### 3. Optimize Lambda
- Increase memory (more memory = more CPU)
- Enable provisioned concurrency for critical functions
- Use Lambda layers for shared dependencies

## Backup and Disaster Recovery

### 1. Enable Backups
```bash
# Enable point-in-time recovery for DynamoDB
aws dynamodb update-continuous-backups \
  --table-name MemoryGame-Games-prod \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### 2. Create Backup Plan
- Daily automated backups
- 30-day retention
- Cross-region replication (optional)

### 3. Test Recovery
- Restore from backup to test environment
- Verify data integrity
- Document recovery procedures

## Monitoring and Alerts

### Key Metrics to Monitor
- Lambda invocations and errors
- API Gateway latency and errors
- DynamoDB read/write capacity
- Cognito authentication failures
- CloudWatch log errors

### Set Up Alerts
- Email alerts for critical errors
- Slack/Discord webhooks for warnings
- PagerDuty for production incidents

## Documentation

### Update Documentation
- [ ] API documentation (GraphQL schema)
- [ ] Architecture diagrams
- [ ] Deployment procedures
- [ ] Troubleshooting guide
- [ ] Runbook for common issues

### Create Runbooks
- How to deploy
- How to rollback
- How to scale
- How to debug issues
- How to add new features

## Success Metrics

Track these metrics:
- User registrations per day
- Games played per day
- Average game duration
- API response times
- Error rates
- Cost per user

## Next Session Checklist

When you come back to work on this:

1. **Check deployment status**
   ```bash
   aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
   ```

2. **Check costs**
   ```bash
   aws ce get-cost-and-usage --time-period Start=2026-03-01,End=2026-03-31 --granularity MONTHLY --metrics BlendedCost
   ```

3. **Review logs for errors**
   ```bash
   aws logs tail /aws/lambda/MemoryGame-Auth-dev --since 1h
   ```

4. **Test critical flows**
   - Registration
   - Login
   - Game play

5. **Continue building features**
   - Pick next service from roadmap
   - Follow established patterns

---

**Congratulations on your deployment! 🎉**

Your backend is now live and serving real users. Keep monitoring, optimizing, and building!
