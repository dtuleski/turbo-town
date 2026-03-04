# Memory Game Infrastructure

AWS CDK infrastructure for the Memory Game application.

## Overview

This directory contains AWS CDK (TypeScript) code for provisioning all infrastructure resources for the Memory Game application across multiple environments (dev, staging, prod).

## Architecture

### 7-Stack Architecture
1. **Database Stack** - 8 DynamoDB tables
2. **Storage Stack** - 3 S3 buckets
3. **Auth Stack** - Cognito User Pool
4. **API Stack** - API Gateway HTTP API
5. **Lambda Stack** - 6 Lambda functions
6. **CDN Stack** - 2 CloudFront distributions
7. **Monitoring Stack** - CloudWatch alarms and SNS

### Resources
- 8 DynamoDB tables (on-demand, PITR enabled)
- 6 Lambda functions (Node.js 20.x)
- 1 API Gateway HTTP API (GraphQL)
- 1 Cognito User Pool (authentication)
- 3 S3 buckets (themes, assets, frontend)
- 2 CloudFront distributions (web, assets)
- 21 CloudWatch alarms
- 1 SNS topic (alerts)

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 20.x
- AWS CDK CLI: `npm install -g aws-cdk`
- Stripe API keys in AWS Secrets Manager

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Bootstrap CDK (First Time Only)
```bash
cdk bootstrap aws://ACCOUNT-NUMBER/us-east-1
```

### 3. Create Secrets
```bash
# Stripe secret key
aws secretsmanager create-secret \
  --name dev/stripe/secret-key \
  --secret-string "sk_test_..."

# Stripe webhook secret
aws secretsmanager create-secret \
  --name dev/stripe/webhook-secret \
  --secret-string "whsec_..."
```

## Deployment

### Deploy to Dev
```bash
npm run deploy:dev
```

### Deploy to Staging
```bash
npm run deploy:staging
```

### Deploy to Production
```bash
npm run deploy:prod
```

### Deploy Specific Stack
```bash
cdk deploy MemoryGameDevDatabase --context environment=dev
```

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Run Tests
```bash
npm test
```

### Synthesize CloudFormation
```bash
npm run synth
```

## Environments

### Dev
- API Throttle: 1K burst / 500 steady
- Log Retention: 7 days
- X-Ray: Disabled
- Cost: ~$30-50/month

### Staging
- API Throttle: 5K burst / 2.5K steady
- Log Retention: 14 days
- X-Ray: Enabled
- Cost: ~$50-80/month

### Production
- API Throttle: 10K burst / 5K steady
- Log Retention: 30 days
- X-Ray: Enabled
- Custom Domain: Supported
- Cost: ~$100-200/month (1K users)

## Stack Dependencies

```
Database Stack (no dependencies)
    ↓
Storage Stack (no dependencies)
    ↓
Auth Stack (no dependencies)
    ↓
API Stack (depends on Auth)
    ↓
Lambda Stack (depends on Database, Auth, API, Storage)
    ↓
CDN Stack (depends on Storage)
    ↓
Monitoring Stack (depends on Lambda, API)
```

## Cleanup

### Destroy Dev Environment
```bash
npm run destroy:dev
```

### Manual Cleanup (Retained Resources)
```bash
# Delete DynamoDB tables
aws dynamodb delete-table --table-name memory-game-users-dev

# Empty and delete S3 buckets
aws s3 rm s3://memory-game-theme-images-dev --recursive
aws s3 rb s3://memory-game-theme-images-dev
```

## Cost Optimization

- DynamoDB: On-demand pricing (no idle costs)
- Lambda: Right-size memory based on monitoring
- S3: Intelligent-Tiering for automatic optimization
- CloudFront: Optimize cache hit ratio

## Security

- IAM: Least privilege policies
- Encryption: At rest (DynamoDB, S3) and in transit (HTTPS)
- Secrets: AWS Secrets Manager
- Network: S3 blocked public access, CloudFront OAI

## Monitoring

- CloudWatch Logs: All services
- CloudWatch Alarms: 21 alarms for errors, latency, throttles
- SNS Notifications: Email alerts
- X-Ray: Distributed tracing (staging/prod)

## Disaster Recovery

- DynamoDB: PITR enabled (5-min RPO, 35-day retention)
- S3: Versioning enabled
- Infrastructure: Git version control
- RTO: 4 hours | RPO: 1 hour

## Documentation

See `aidlc-docs/construction/infrastructure/` for detailed documentation:
- Functional Design
- NFR Requirements
- NFR Design
- Infrastructure Design
- Implementation Summary

## Support

For issues or questions, contact the development team.
