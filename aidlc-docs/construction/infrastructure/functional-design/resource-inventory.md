# Resource Inventory - Infrastructure

## Overview
This document provides a complete inventory of all AWS resources required for the memory game application.

**IaC Tool**: AWS CDK (TypeScript)
**Environment Strategy**: Single account, multiple stacks (dev, staging, prod)

---

## DynamoDB Tables

### 1. Users Table
**Purpose**: Store user account information
**Partition Key**: `userId` (String)
**Attributes**: email, name, profilePictureUrl, role, tier, cognitoId, emailVerified, createdAt, updatedAt, lastLoginAt
**GSIs**:
- EmailIndex: email (PK) - for email lookups
- CognitoIdIndex: cognitoId (PK) - for Cognito integration
**Capacity**: On-demand

### 2. Games Table
**Purpose**: Store game records and history
**Partition Key**: `userId` (String)
**Sort Key**: `gameId` (String)
**Attributes**: themeId, difficulty, status, startedAt, completedAt, completionTime, attempts, score, createdAt, updatedAt
**GSIs**:
- ThemeIndex: themeId (PK), completedAt (SK) - for theme-based queries
- StatusIndex: status (PK), startedAt (SK) - for status-based queries
**Capacity**: On-demand

### 3. Leaderboards Table
**Purpose**: Store leaderboard entries
**Partition Key**: `themeId#difficulty#timePeriod` (String - composite)
**Sort Key**: `score#userId` (String - composite, descending)
**Attributes**: userId, userName, score, rank, completionTime, attempts, achievedAt, createdAt, updatedAt
**GSIs**:
- UserIndex: userId (PK), achievedAt (SK) - for user leaderboard history
**Capacity**: On-demand

### 4. Subscriptions Table
**Purpose**: Store subscription information
**Partition Key**: `userId` (String)
**Attributes**: tier, status, billingPeriod, stripeCustomerId, stripeSubscriptionId, currentPeriodStart, currentPeriodEnd, cancelAt, cancelledAt, createdAt, updatedAt
**GSIs**:
- StripeCustomerIndex: stripeCustomerId (PK) - for Stripe webhook lookups
- StatusIndex: status (PK), currentPeriodEnd (SK) - for expiration queries
**Capacity**: On-demand

### 5. Themes Table
**Purpose**: Store game themes and content
**Partition Key**: `themeId` (String)
**Attributes**: name, description, category, status, imageUrls, pairs, difficulty, createdBy, publishedAt, createdAt, updatedAt
**GSIs**:
- CategoryIndex: category (PK), publishedAt (SK) - for category browsing
- StatusIndex: status (PK), publishedAt (SK) - for published themes
**Capacity**: On-demand

### 6. Achievements Table
**Purpose**: Store user achievement progress
**Partition Key**: `userId` (String)
**Sort Key**: `achievementType` (String)
**Attributes**: progress, completed, completedAt, createdAt, updatedAt
**Capacity**: On-demand

### 7. RateLimits Table
**Purpose**: Track rate limiting for game plays
**Partition Key**: `userId` (String)
**Attributes**: tier, count, resetAt, updatedAt
**TTL**: resetAt (automatic cleanup)
**Capacity**: On-demand

### 8. UserSettings Table
**Purpose**: Store user preferences and settings
**Partition Key**: `userId` (String)
**Attributes**: soundEffectsEnabled, musicEnabled, soundVolume, musicVolume, notificationsEnabled, language, theme, autoProgressDifficulty, createdAt, updatedAt
**Capacity**: On-demand

---

## Lambda Functions

### 1. Auth Service Lambda
**Purpose**: Handle authentication and user management
**Runtime**: Node.js 20.x
**Memory**: 512 MB
**Timeout**: 30 seconds
**Environment Variables**: COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, JWT_SECRET, DYNAMODB_USERS_TABLE

### 2. Game Service Lambda
**Purpose**: Handle game logic and gameplay
**Runtime**: Node.js 20.x
**Memory**: 512 MB
**Timeout**: 30 seconds
**Environment Variables**: DYNAMODB_GAMES_TABLE, DYNAMODB_RATE_LIMITS_TABLE, DYNAMODB_ACHIEVEMENTS_TABLE

### 3. Leaderboard Service Lambda
**Purpose**: Handle leaderboard queries and updates
**Runtime**: Node.js 20.x
**Memory**: 256 MB
**Timeout**: 15 seconds
**Environment Variables**: DYNAMODB_LEADERBOARDS_TABLE, DYNAMODB_GAMES_TABLE

### 4. Payment Service Lambda
**Purpose**: Handle subscription and payment processing
**Runtime**: Node.js 20.x
**Memory**: 512 MB
**Timeout**: 30 seconds
**Environment Variables**: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DYNAMODB_SUBSCRIPTIONS_TABLE, DYNAMODB_USERS_TABLE

### 5. CMS Service Lambda
**Purpose**: Handle theme and content management
**Runtime**: Node.js 20.x
**Memory**: 512 MB
**Timeout**: 30 seconds
**Environment Variables**: DYNAMODB_THEMES_TABLE, S3_THEME_IMAGES_BUCKET, CLOUDFRONT_DISTRIBUTION_ID

### 6. Admin Service Lambda
**Purpose**: Handle admin operations and analytics
**Runtime**: Node.js 20.x
**Memory**: 512 MB
**Timeout**: 30 seconds
**Environment Variables**: DYNAMODB_USERS_TABLE, DYNAMODB_GAMES_TABLE, DYNAMODB_SUBSCRIPTIONS_TABLE, DYNAMODB_THEMES_TABLE

---

## API Gateway

### GraphQL API
**Type**: HTTP API (API Gateway v2)
**Protocol**: HTTP/HTTPS
**Endpoint**: Single GraphQL endpoint (`/graphql`)
**Authorizer**: AWS Cognito User Pool
**CORS**: Enabled for web frontend domain
**Throttling**: 10,000 requests per second (burst), 5,000 requests per second (steady)
**Integrations**:
- Auth Service Lambda
- Game Service Lambda
- Leaderboard Service Lambda
- Payment Service Lambda
- CMS Service Lambda
- Admin Service Lambda

---

## S3 Buckets

### 1. Theme Images Bucket
**Purpose**: Store theme card images
**Versioning**: Enabled
**Encryption**: AES-256 (SSE-S3)
**Lifecycle**: Delete incomplete multipart uploads after 7 days
**CORS**: Enabled for web frontend domain
**Public Access**: Blocked (access via CloudFront only)

### 2. User Assets Bucket
**Purpose**: Store user profile pictures
**Versioning**: Disabled
**Encryption**: AES-256 (SSE-S3)
**Lifecycle**: Delete objects after 90 days of inactivity
**CORS**: Enabled for web frontend domain
**Public Access**: Blocked (access via CloudFront only)

### 3. Web Frontend Bucket
**Purpose**: Host static web application
**Versioning**: Enabled
**Encryption**: AES-256 (SSE-S3)
**Website Hosting**: Enabled
**Public Access**: Allowed (via CloudFront only)

---

## CloudFront Distributions

### 1. Web Frontend Distribution
**Origin**: Web Frontend S3 Bucket
**Viewer Protocol**: Redirect HTTP to HTTPS
**Caching**: Optimized for static content
**Compression**: Enabled (Gzip, Brotli)
**Custom Domain**: Optional (e.g., app.memorygame.com)
**SSL Certificate**: AWS Certificate Manager

### 2. Assets Distribution
**Origins**: Theme Images Bucket, User Assets Bucket
**Viewer Protocol**: HTTPS only
**Caching**: Optimized for images (long TTL)
**Compression**: Enabled
**Custom Domain**: Optional (e.g., assets.memorygame.com)
**SSL Certificate**: AWS Certificate Manager

---

## Cognito User Pool

### User Pool Configuration
**Purpose**: User authentication and management
**Sign-in Options**: Email, Username
**Password Policy**: Minimum 8 characters, uppercase, lowercase, number
**MFA**: Optional (TOTP)
**Email Verification**: Required
**Social Providers**: Google, Facebook (optional)
**User Attributes**: email (required), name (required), profile picture (optional)
**Lambda Triggers**:
- Pre-signup: Email validation
- Post-confirmation: Create user record in DynamoDB

### App Client
**Purpose**: Web frontend authentication
**Auth Flows**: USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH
**Token Expiry**: Access token 1 hour, Refresh token 30 days

---

## IAM Roles and Policies

### 1. Lambda Execution Role (per service)
**Purpose**: Allow Lambda functions to access AWS resources
**Policies**:
- CloudWatch Logs (write)
- DynamoDB (read/write for specific tables)
- S3 (read/write for specific buckets)
- Cognito (read user pool)
- X-Ray (write traces)

### 2. API Gateway Execution Role
**Purpose**: Allow API Gateway to invoke Lambda functions
**Policies**:
- Lambda (invoke function)

### 3. CloudFront OAI Role
**Purpose**: Allow CloudFront to access S3 buckets
**Policies**:
- S3 (read objects from specific buckets)

---

## CloudWatch Resources

### Log Groups
- `/aws/lambda/auth-service`
- `/aws/lambda/game-service`
- `/aws/lambda/leaderboard-service`
- `/aws/lambda/payment-service`
- `/aws/lambda/cms-service`
- `/aws/lambda/admin-service`
- `/aws/apigateway/graphql-api`

**Retention**: 30 days

### Alarms

#### Lambda Errors Alarm (per service)
**Metric**: Errors
**Threshold**: > 10 errors in 5 minutes
**Action**: SNS notification

#### Lambda Duration Alarm (per service)
**Metric**: Duration
**Threshold**: > 25 seconds (approaching timeout)
**Action**: SNS notification

#### API Gateway 5xx Errors Alarm
**Metric**: 5XXError
**Threshold**: > 50 errors in 5 minutes
**Action**: SNS notification

#### API Gateway Latency Alarm
**Metric**: Latency
**Threshold**: > 2000ms (p99)
**Action**: SNS notification

#### DynamoDB Throttle Alarm (per table)
**Metric**: UserErrors (throttling)
**Threshold**: > 10 throttles in 5 minutes
**Action**: SNS notification

---

## VPC and Networking

**Decision**: No VPC required for this architecture
**Rationale**:
- All services use managed AWS services (Lambda, DynamoDB, S3, API Gateway)
- No EC2 instances or RDS databases
- Cognito and API Gateway handle authentication
- CloudFront provides CDN and DDoS protection
- Simpler architecture, lower cost, easier management

**Note**: If VPC is needed in the future (e.g., for RDS, ElastiCache), it can be added without affecting existing resources.

---

## Resource Summary

**Total Resources**: 50+
- DynamoDB Tables: 8
- Lambda Functions: 6
- API Gateway: 1 (HTTP API)
- S3 Buckets: 3
- CloudFront Distributions: 2
- Cognito User Pool: 1
- IAM Roles: 8+
- CloudWatch Log Groups: 7
- CloudWatch Alarms: 15+

**Estimated Monthly Cost** (low traffic):
- DynamoDB (on-demand): $10-50
- Lambda: $5-20
- API Gateway: $3-10
- S3: $1-5
- CloudFront: $5-15
- Cognito: Free tier (up to 50,000 MAUs)
- CloudWatch: $5-10
**Total**: ~$30-110/month (scales with usage)
