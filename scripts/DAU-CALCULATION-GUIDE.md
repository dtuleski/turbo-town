# How to Calculate DAU (Daily Active Users)

## Quick Answer

**DAU = Count of unique users who performed any action in your app today**

For DashDen, this means users who:
- Played a game
- Logged in
- Accessed any feature

---

## 3 Methods to Calculate DAU

### Method 1: Games Table (Most Accurate) ✅

**What it measures**: Users who actually played games today

**Query**:
```bash
aws dynamodb scan \
  --table-name memory-game-games-dev \
  --filter-expression "begins_with(startedAt, :today)" \
  --expression-attribute-values '{":today":{"S":"2025-03-07"}}' \
  --projection-expression "userId" \
  --region us-east-1 \
  | jq -r '.Items[].userId.S' \
  | sort -u \
  | wc -l
```

**Pros**:
- Most accurate representation of engaged users
- Shows actual usage, not just logins
- Can break down by game type

**Cons**:
- Slower for large datasets
- Requires scanning the table

---

### Method 2: Rate Limits Table (Fastest) ⚡

**What it measures**: Users who accessed the system today

**Query**:
```bash
aws dynamodb scan \
  --table-name memory-game-rate-limits-dev \
  --filter-expression "begins_with(updatedAt, :today)" \
  --expression-attribute-values '{":today":{"S":"2025-03-07"}}' \
  --projection-expression "userId" \
  --region us-east-1 \
  | jq -r '.Items[].userId.S' \
  | sort -u \
  | wc -l
```

**Pros**:
- Very fast (smaller table)
- Includes all user activity
- Shows subscription tier breakdown

**Cons**:
- May include users who logged in but didn't play

---

### Method 3: CloudWatch Logs Insights 📊

**What it measures**: API activity from logs

**Query**:
```bash
# Get today's timestamps
START=$(date -u -d "today 00:00:00" +%s)000
END=$(date -u -d "today 23:59:59" +%s)999

# Run CloudWatch Insights query
aws logs start-query \
  --log-group-name "/aws/apigateway/memory-game-dev" \
  --start-time $START \
  --end-time $END \
  --query-string 'fields @timestamp | filter @message like /userId/ | stats count_distinct(@message)' \
  --region us-east-1
```

**Pros**:
- Can analyze any log pattern
- Historical data available
- No table scans needed

**Cons**:
- Requires log parsing
- May have sampling in high-volume scenarios

---

## Automated Scripts

I've created two scripts for you:

### Bash Script (Quick & Simple)
```bash
./scripts/calculate-dau.sh
```

**Features**:
- Runs all 3 methods
- Shows breakdown by subscription tier
- Calculates engagement metrics
- Outputs summary report

### Python Script (Detailed Analytics)
```bash
python3 scripts/calculate-dau.py
```

**Features**:
- Detailed user engagement analysis
- Games by theme breakdown
- User distribution (1 game, 2 games, 3+ games)
- Conversion opportunity identification
- MAU estimation

**Requirements**:
```bash
pip3 install boto3
```

---

## Understanding the Results

### Example Output:
```
Daily Active Users: 150

Breakdown:
  - Free tier: 105 users (70%)
  - Paid users: 45 users (30%)

Engagement:
  - Total games played: 420
  - Games per user: 2.8
```

### What This Tells You:

1. **DAU = 150**: You had 150 unique users today
2. **70% free users**: Conversion opportunity
3. **2.8 games/user**: Good engagement (free limit is 3)
4. **420 total games**: Total activity volume

---

## Related Metrics

### MAU (Monthly Active Users)
**Formula**: Count unique users over 30 days

**Quick Estimate**: MAU ≈ DAU × 20
- Assumes 67% of users return monthly
- More accurate: Track actual 30-day unique users

**Query**:
```bash
# Get last 30 days
THIRTY_DAYS_AGO=$(date -u -d "30 days ago" +"%Y-%m-%d")

aws dynamodb scan \
  --table-name memory-game-games-dev \
  --filter-expression "startedAt >= :date" \
  --expression-attribute-values "{\":date\":{\"S\":\"$THIRTY_DAYS_AGO\"}}" \
  --projection-expression "userId" \
  --region us-east-1 \
  | jq -r '.Items[].userId.S' \
  | sort -u \
  | wc -l
```

### WAU (Weekly Active Users)
**Formula**: Count unique users over 7 days

**Query**: Same as MAU but with 7 days

### DAU/MAU Ratio (Stickiness)
**Formula**: DAU ÷ MAU × 100

**Interpretation**:
- 20%+ = Excellent (users return daily)
- 10-20% = Good (users return regularly)
- <10% = Needs improvement

**Example**:
- DAU = 150
- MAU = 1,000
- Stickiness = 15% (good!)

---

## Setting Up Automated Tracking

### Option 1: CloudWatch Dashboard

Create a dashboard to track DAU automatically:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name DashDen-DAU \
  --dashboard-body file://cloudwatch-dashboard.json
```

### Option 2: Daily Cron Job

Run the calculation script daily:

```bash
# Add to crontab
0 1 * * * /path/to/calculate-dau.sh >> /var/log/dau.log 2>&1
```

### Option 3: Lambda Function

Create a Lambda that runs daily and stores results:

```javascript
// Lambda function to calculate and store DAU
exports.handler = async (event) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Query DynamoDB
  const result = await dynamodb.scan({
    TableName: 'memory-game-games-dev',
    FilterExpression: 'begins_with(startedAt, :today)',
    ExpressionAttributeValues: {
      ':today': today
    }
  }).promise();
  
  // Count unique users
  const uniqueUsers = new Set(result.Items.map(i => i.userId));
  const dau = uniqueUsers.size;
  
  // Store in CloudWatch Metrics
  await cloudwatch.putMetricData({
    Namespace: 'DashDen/Analytics',
    MetricData: [{
      MetricName: 'DAU',
      Value: dau,
      Timestamp: new Date(),
      Unit: 'Count'
    }]
  }).promise();
  
  return { dau };
};
```

---

## Best Practices

### 1. Use UTC Timezone
Always calculate DAU in UTC to avoid timezone issues:
```bash
TODAY=$(date -u +"%Y-%m-%d")
```

### 2. Cache Results
Don't recalculate DAU multiple times per day:
- Calculate once at midnight
- Store in CloudWatch Metrics
- Query metrics for dashboards

### 3. Track Trends
Monitor DAU over time:
- Day-over-day growth
- Week-over-week trends
- Month-over-month comparison

### 4. Segment Your Users
Break down DAU by:
- Subscription tier (free vs paid)
- Game type preference
- New vs returning users
- Geographic region (if tracked)

---

## Quick Reference Commands

### Today's DAU (Fast)
```bash
aws dynamodb scan \
  --table-name memory-game-rate-limits-dev \
  --filter-expression "begins_with(updatedAt, :today)" \
  --expression-attribute-values "{\":today\":{\"S\":\"$(date -u +%Y-%m-%d)\"}}" \
  --region us-east-1 \
  --query 'Items[].userId.S' \
  --output text | tr '\t' '\n' | sort -u | wc -l
```

### Yesterday's DAU
```bash
YESTERDAY=$(date -u -d "yesterday" +"%Y-%m-%d")
aws dynamodb scan \
  --table-name memory-game-games-dev \
  --filter-expression "begins_with(startedAt, :date)" \
  --expression-attribute-values "{\":date\":{\"S\":\"$YESTERDAY\"}}" \
  --region us-east-1 \
  --query 'Items[].userId.S' \
  --output text | tr '\t' '\n' | sort -u | wc -l
```

### Last 7 Days Average DAU
```bash
for i in {0..6}; do
  DATE=$(date -u -d "$i days ago" +"%Y-%m-%d")
  COUNT=$(aws dynamodb scan \
    --table-name memory-game-games-dev \
    --filter-expression "begins_with(startedAt, :date)" \
    --expression-attribute-values "{\":date\":{\"S\":\"$DATE\"}}" \
    --region us-east-1 \
    --query 'Items[].userId.S' \
    --output text | tr '\t' '\n' | sort -u | wc -l)
  echo "$DATE: $COUNT users"
done
```

---

## Troubleshooting

### "No data returned"
- Check table names match your environment
- Verify date format (YYYY-MM-DD)
- Ensure AWS credentials are configured

### "Scan taking too long"
- Use Rate Limits table instead of Games table
- Add pagination for large datasets
- Consider using CloudWatch Logs Insights

### "Numbers don't match between methods"
- Games table = users who played
- Rate limits table = users who accessed system
- Both are valid, choose based on your definition of "active"

---

## Next Steps

1. **Run the scripts** to see your current DAU
2. **Set up daily tracking** with cron or Lambda
3. **Create CloudWatch dashboard** for visualization
4. **Monitor trends** over time
5. **Use insights** to optimize user acquisition and retention

---

## Summary

**Recommended Approach**:
1. Use **Games Table** for accurate DAU (users who played)
2. Use **Rate Limits Table** for quick checks
3. Set up **automated daily calculation**
4. Track trends in **CloudWatch Metrics**
5. Build **dashboards** for visualization

Your backend is already collecting all the data you need. Just run the scripts and start tracking! 🚀
