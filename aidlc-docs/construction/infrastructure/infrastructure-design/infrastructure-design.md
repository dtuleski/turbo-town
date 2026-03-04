# Infrastructure Design - Infrastructure Unit

## Overview
This document maps logical software components to actual AWS services for the memory game application infrastructure.

**IaC Tool**: AWS CDK (TypeScript)
**Cloud Provider**: Amazon Web Services (AWS)
**Architecture**: Serverless microservices with managed services
**Deployment Model**: Multi-stack CDK application

---

## Service Mapping Overview

| Logical Component | AWS Service | CDK Stack | Rationale |
|-------------------|-------------|-----------|-----------|
| User Data Store | DynamoDB | Database | NoSQL, on-demand scaling, fully managed |
| Game Records Store | DynamoDB | Database | NoSQL, flexible schema, GSI support |
| Leaderboard Store | DynamoDB | Database | NoSQL, composite keys for ranking |
| Subscription Store | DynamoDB | Database | NoSQL, Stripe integration |
| Theme Content Store | DynamoDB | Database | NoSQL, metadata storage |
| Achievement Store | DynamoDB | Database | NoSQL, user progress tracking |
| Rate Limit Store | DynamoDB | Database | NoSQL, TTL for automatic cleanup |
| User Settings Store | DynamoDB | Database | NoSQL, user preferences |
| Auth Service | Lambda | Lambda | Serverless compute, auto-scaling |
| Game Service | Lambda | Lambda | Serverless compute, auto-scaling |
| Leaderboard Service | Lambda | Lambda | Serverless compute, auto-scaling |
| Payment Service | Lambda | Lambda | Serverless compute, auto-scaling |
| CMS Service | Lambda | Lambda | Serverless compute, auto-scaling |
| Admin Service | Lambda | Lambda | Serverless compute, auto-scaling |
| GraphQL API | API Gateway | API | HTTP API, Cognito integration |
| Authentication | Cognito | Auth | Managed auth, MFA, social providers |
| Theme Images | S3 | Storage | Object storage, versioning |
| User Assets | S3 | Storage | Object storage, lifecycle policies |
| Web Frontend | S3 | Storage | Static website hosting |
| CDN (Frontend) | CloudFront | CDN | Edge caching, HTTPS, compression |
| CDN (Assets) | CloudFront | CDN | Edge caching, image optimization |
| Logs | CloudWatch | Monitoring | Centralized logging |
| Metrics | CloudWatch | Monitoring | Performance monitoring |
| Alarms | CloudWatch | Monitoring | Alerting and notifications |

---

## Data Layer Mapping

### DynamoDB Tables (Database Stack)

#### 1. Users Table
**Logical Component**: User account data store
**AWS Service**: DynamoDB Table
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  tableName: `memory-game-users-${environment}`,
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

// GSI for email lookups
usersTable.addGlobalSecondaryIndex({
  indexName: 'EmailIndex',
  partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
});

// GSI for Cognito integration
usersTable.addGlobalSecondaryIndex({
  indexName: 'CognitoIdIndex',
  partitionKey: { name: 'cognitoId', type: dynamodb.AttributeType.STRING },
});
```

**Integration Points**:
- Auth Service Lambda (read/write)
- Admin Service Lambda (read)
- Payment Service Lambda (read/write for tier updates)

#### 2. Games Table
**Logical Component**: Game records and history store
**AWS Service**: DynamoDB Table
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const gamesTable = new dynamodb.Table(this, 'GamesTable', {
  tableName: `memory-game-games-${environment}`,
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

// GSI for theme-based queries
gamesTable.addGlobalSecondaryIndex({
  indexName: 'ThemeIndex',
  partitionKey: { name: 'themeId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'completedAt', type: dynamodb.AttributeType.STRING },
});

// GSI for status-based queries
gamesTable.addGlobalSecondaryIndex({
  indexName: 'StatusIndex',
  partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'startedAt', type: dynamodb.AttributeType.STRING },
});
```

**Integration Points**:
- Game Service Lambda (read/write)
- Leaderboard Service Lambda (read for score calculation)
- Admin Service Lambda (read for analytics)


#### 3. Leaderboards Table
**Logical Component**: Leaderboard rankings store
**AWS Service**: DynamoDB Table
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const leaderboardsTable = new dynamodb.Table(this, 'LeaderboardsTable', {
  tableName: `memory-game-leaderboards-${environment}`,
  partitionKey: { 
    name: 'themeIdDifficultyPeriod', 
    type: dynamodb.AttributeType.STRING 
  },
  sortKey: { 
    name: 'scoreUserId', 
    type: dynamodb.AttributeType.STRING 
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

// GSI for user leaderboard history
leaderboardsTable.addGlobalSecondaryIndex({
  indexName: 'UserIndex',
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'achievedAt', type: dynamodb.AttributeType.STRING },
});
```

**Integration Points**:
- Leaderboard Service Lambda (read/write)
- Game Service Lambda (write on game completion)

#### 4. Subscriptions Table
**Logical Component**: Subscription and payment data store
**AWS Service**: DynamoDB Table
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const subscriptionsTable = new dynamodb.Table(this, 'SubscriptionsTable', {
  tableName: `memory-game-subscriptions-${environment}`,
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

// GSI for Stripe webhook lookups
subscriptionsTable.addGlobalSecondaryIndex({
  indexName: 'StripeCustomerIndex',
  partitionKey: { name: 'stripeCustomerId', type: dynamodb.AttributeType.STRING },
});

// GSI for expiration queries
subscriptionsTable.addGlobalSecondaryIndex({
  indexName: 'StatusIndex',
  partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'currentPeriodEnd', type: dynamodb.AttributeType.STRING },
});
```

**Integration Points**:
- Payment Service Lambda (read/write)
- Game Service Lambda (read for tier validation)
- Admin Service Lambda (read for analytics)

#### 5. Themes Table
**Logical Component**: Theme content metadata store
**AWS Service**: DynamoDB Table
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const themesTable = new dynamodb.Table(this, 'ThemesTable', {
  tableName: `memory-game-themes-${environment}`,
  partitionKey: { name: 'themeId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

// GSI for category browsing
themesTable.addGlobalSecondaryIndex({
  indexName: 'CategoryIndex',
  partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
});

// GSI for published themes
themesTable.addGlobalSecondaryIndex({
  indexName: 'StatusIndex',
  partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
});
```

**Integration Points**:
- CMS Service Lambda (read/write)
- Game Service Lambda (read for theme data)
- Admin Service Lambda (read for analytics)


#### 6. Achievements Table
**Logical Component**: User achievement progress store
**AWS Service**: DynamoDB Table
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const achievementsTable = new dynamodb.Table(this, 'AchievementsTable', {
  tableName: `memory-game-achievements-${environment}`,
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'achievementType', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});
```

**Integration Points**:
- Game Service Lambda (read/write)
- Admin Service Lambda (read for analytics)

#### 7. RateLimits Table
**Logical Component**: Rate limiting tracker
**AWS Service**: DynamoDB Table with TTL
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const rateLimitsTable = new dynamodb.Table(this, 'RateLimitsTable', {
  tableName: `memory-game-rate-limits-${environment}`,
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  timeToLiveAttribute: 'resetAt', // Automatic cleanup
  removalPolicy: RemovalPolicy.RETAIN,
});
```

**Integration Points**:
- Game Service Lambda (read/write)

#### 8. UserSettings Table
**Logical Component**: User preferences store
**AWS Service**: DynamoDB Table
**CDK Construct**: `dynamodb.Table`
**Configuration**:
```typescript
const userSettingsTable = new dynamodb.Table(this, 'UserSettingsTable', {
  tableName: `memory-game-user-settings-${environment}`,
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});
```

**Integration Points**:
- Auth Service Lambda (read/write)
- Game Service Lambda (read for game preferences)

---

## Compute Layer Mapping

### Lambda Functions (Lambda Stack)

#### 1. Auth Service Lambda
**Logical Component**: Authentication and user management service
**AWS Service**: Lambda Function
**CDK Construct**: `lambda.Function`
**Configuration**:
```typescript
const authServiceLambda = new lambda.Function(this, 'AuthService', {
  functionName: `memory-game-auth-${environment}`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('../../services/auth/dist'),
  memorySize: 512,
  timeout: Duration.seconds(30),
  reservedConcurrentExecutions: 100,
  environment: {
    COGNITO_USER_POOL_ID: userPool.userPoolId,
    COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
    DYNAMODB_USERS_TABLE: usersTable.tableName,
    DYNAMODB_USER_SETTINGS_TABLE: userSettingsTable.tableName,
    NODE_ENV: environment,
  },
  logRetention: logs.RetentionDays.ONE_MONTH,
});

// Grant permissions
usersTable.grantReadWriteData(authServiceLambda);
userSettingsTable.grantReadWriteData(authServiceLambda);
```

**Integration Points**:
- API Gateway (GraphQL endpoint)
- Cognito User Pool (authentication)
- Users Table (user data)
- UserSettings Table (preferences)


#### 2. Game Service Lambda
**Logical Component**: Game logic and gameplay service
**AWS Service**: Lambda Function
**CDK Construct**: `lambda.Function`
**Configuration**:
```typescript
const gameServiceLambda = new lambda.Function(this, 'GameService', {
  functionName: `memory-game-game-${environment}`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('../../services/game/dist'),
  memorySize: 512,
  timeout: Duration.seconds(30),
  reservedConcurrentExecutions: 100,
  environment: {
    DYNAMODB_GAMES_TABLE: gamesTable.tableName,
    DYNAMODB_RATE_LIMITS_TABLE: rateLimitsTable.tableName,
    DYNAMODB_ACHIEVEMENTS_TABLE: achievementsTable.tableName,
    DYNAMODB_THEMES_TABLE: themesTable.tableName,
    DYNAMODB_SUBSCRIPTIONS_TABLE: subscriptionsTable.tableName,
    NODE_ENV: environment,
  },
  logRetention: logs.RetentionDays.ONE_MONTH,
});

// Grant permissions
gamesTable.grantReadWriteData(gameServiceLambda);
rateLimitsTable.grantReadWriteData(gameServiceLambda);
achievementsTable.grantReadWriteData(gameServiceLambda);
themesTable.grantReadData(gameServiceLambda);
subscriptionsTable.grantReadData(gameServiceLambda);
```

**Integration Points**:
- API Gateway (GraphQL endpoint)
- Games Table (game records)
- RateLimits Table (rate limiting)
- Achievements Table (achievement tracking)
- Themes Table (theme data)
- Subscriptions Table (tier validation)

#### 3. Leaderboard Service Lambda
**Logical Component**: Leaderboard queries and updates service
**AWS Service**: Lambda Function
**CDK Construct**: `lambda.Function`
**Configuration**:
```typescript
const leaderboardServiceLambda = new lambda.Function(this, 'LeaderboardService', {
  functionName: `memory-game-leaderboard-${environment}`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('../../services/leaderboard/dist'),
  memorySize: 256,
  timeout: Duration.seconds(15),
  reservedConcurrentExecutions: 100,
  environment: {
    DYNAMODB_LEADERBOARDS_TABLE: leaderboardsTable.tableName,
    DYNAMODB_GAMES_TABLE: gamesTable.tableName,
    NODE_ENV: environment,
  },
  logRetention: logs.RetentionDays.ONE_MONTH,
});

// Grant permissions
leaderboardsTable.grantReadWriteData(leaderboardServiceLambda);
gamesTable.grantReadData(leaderboardServiceLambda);
```

**Integration Points**:
- API Gateway (GraphQL endpoint)
- Leaderboards Table (rankings)
- Games Table (score data)

#### 4. Payment Service Lambda
**Logical Component**: Subscription and payment processing service
**AWS Service**: Lambda Function
**CDK Construct**: `lambda.Function`
**Configuration**:
```typescript
const paymentServiceLambda = new lambda.Function(this, 'PaymentService', {
  functionName: `memory-game-payment-${environment}`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('../../services/payment/dist'),
  memorySize: 512,
  timeout: Duration.seconds(30),
  reservedConcurrentExecutions: 100,
  environment: {
    STRIPE_SECRET_KEY_ARN: stripeSecretKey.secretArn,
    STRIPE_WEBHOOK_SECRET_ARN: stripeWebhookSecret.secretArn,
    DYNAMODB_SUBSCRIPTIONS_TABLE: subscriptionsTable.tableName,
    DYNAMODB_USERS_TABLE: usersTable.tableName,
    NODE_ENV: environment,
  },
  logRetention: logs.RetentionDays.ONE_MONTH,
});

// Grant permissions
subscriptionsTable.grantReadWriteData(paymentServiceLambda);
usersTable.grantReadWriteData(paymentServiceLambda);
stripeSecretKey.grantRead(paymentServiceLambda);
stripeWebhookSecret.grantRead(paymentServiceLambda);
```

**Integration Points**:
- API Gateway (GraphQL endpoint + webhook endpoint)
- Subscriptions Table (subscription data)
- Users Table (tier updates)
- Secrets Manager (Stripe API keys)


#### 5. CMS Service Lambda
**Logical Component**: Theme and content management service
**AWS Service**: Lambda Function
**CDK Construct**: `lambda.Function`
**Configuration**:
```typescript
const cmsServiceLambda = new lambda.Function(this, 'CMSService', {
  functionName: `memory-game-cms-${environment}`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('../../services/cms/dist'),
  memorySize: 512,
  timeout: Duration.seconds(30),
  reservedConcurrentExecutions: 100,
  environment: {
    DYNAMODB_THEMES_TABLE: themesTable.tableName,
    S3_THEME_IMAGES_BUCKET: themeImagesBucket.bucketName,
    CLOUDFRONT_DISTRIBUTION_ID: assetsDistribution.distributionId,
    NODE_ENV: environment,
  },
  logRetention: logs.RetentionDays.ONE_MONTH,
});

// Grant permissions
themesTable.grantReadWriteData(cmsServiceLambda);
themeImagesBucket.grantReadWrite(cmsServiceLambda);
```

**Integration Points**:
- API Gateway (GraphQL endpoint)
- Themes Table (theme metadata)
- S3 Theme Images Bucket (theme assets)
- CloudFront (cache invalidation)

#### 6. Admin Service Lambda
**Logical Component**: Admin operations and analytics service
**AWS Service**: Lambda Function
**CDK Construct**: `lambda.Function`
**Configuration**:
```typescript
const adminServiceLambda = new lambda.Function(this, 'AdminService', {
  functionName: `memory-game-admin-${environment}`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('../../services/admin/dist'),
  memorySize: 512,
  timeout: Duration.seconds(30),
  reservedConcurrentExecutions: 100,
  environment: {
    DYNAMODB_USERS_TABLE: usersTable.tableName,
    DYNAMODB_GAMES_TABLE: gamesTable.tableName,
    DYNAMODB_SUBSCRIPTIONS_TABLE: subscriptionsTable.tableName,
    DYNAMODB_THEMES_TABLE: themesTable.tableName,
    NODE_ENV: environment,
  },
  logRetention: logs.RetentionDays.ONE_MONTH,
});

// Grant permissions
usersTable.grantReadWriteData(adminServiceLambda);
gamesTable.grantReadData(adminServiceLambda);
subscriptionsTable.grantReadData(adminServiceLambda);
themesTable.grantReadData(adminServiceLambda);
```

**Integration Points**:
- API Gateway (GraphQL endpoint)
- Users Table (user management)
- Games Table (analytics)
- Subscriptions Table (analytics)
- Themes Table (analytics)

---

## API Layer Mapping

### API Gateway (API Stack)

**Logical Component**: GraphQL API endpoint
**AWS Service**: API Gateway HTTP API (v2)
**CDK Construct**: `apigateway.HttpApi`
**Configuration**:
```typescript
const api = new apigateway.HttpApi(this, 'GraphQLApi', {
  apiName: `memory-game-api-${environment}`,
  description: 'GraphQL API for memory game application',
  corsPreflight: {
    allowOrigins: [`https://app-${environment}.memorygame.com`],
    allowMethods: [apigateway.CorsHttpMethod.POST],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: Duration.hours(1),
  },
  defaultThrottle: {
    burstLimit: environment === 'prod' ? 10000 : 1000,
    rateLimit: environment === 'prod' ? 5000 : 500,
  },
});

// Cognito authorizer
const authorizer = new apigateway.HttpUserPoolAuthorizer({
  userPool: userPool,
  userPoolClient: userPoolClient,
  identitySource: ['$request.header.Authorization'],
});

// GraphQL endpoint
api.addRoutes({
  path: '/graphql',
  methods: [apigateway.HttpMethod.POST],
  integration: new integrations.HttpLambdaIntegration(
    'GraphQLIntegration',
    graphqlResolverLambda
  ),
  authorizer: authorizer,
});
```

**Integration Points**:
- All Lambda functions (via GraphQL resolver)
- Cognito User Pool (authorization)
- CloudWatch (access logs)


---

## Authentication Layer Mapping

### Cognito User Pool (Auth Stack)

**Logical Component**: User authentication and management
**AWS Service**: Cognito User Pool
**CDK Construct**: `cognito.UserPool`
**Configuration**:
```typescript
const userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: `memory-game-users-${environment}`,
  selfSignUpEnabled: true,
  signInAliases: {
    email: true,
    username: true,
  },
  autoVerify: {
    email: true,
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: false,
  },
  mfa: cognito.Mfa.OPTIONAL,
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
  removalPolicy: RemovalPolicy.RETAIN,
});

// User Pool Client
const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
  userPool: userPool,
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
  accessTokenValidity: Duration.hours(1),
  refreshTokenValidity: Duration.days(30),
});

// Lambda triggers
userPool.addTrigger(
  cognito.UserPoolOperation.PRE_SIGN_UP,
  preSignUpLambda
);
userPool.addTrigger(
  cognito.UserPoolOperation.POST_CONFIRMATION,
  postConfirmationLambda
);
```

**Integration Points**:
- API Gateway (authorizer)
- Auth Service Lambda (user management)
- Pre-signup Lambda (email validation)
- Post-confirmation Lambda (create user record)

---

## Storage Layer Mapping

### S3 Buckets (Storage Stack)

#### 1. Theme Images Bucket
**Logical Component**: Theme card images storage
**AWS Service**: S3 Bucket
**CDK Construct**: `s3.Bucket`
**Configuration**:
```typescript
const themeImagesBucket = new s3.Bucket(this, 'ThemeImagesBucket', {
  bucketName: `memory-game-theme-images-${environment}`,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  lifecycleRules: [
    {
      id: 'DeleteIncompleteUploads',
      abortIncompleteMultipartUploadAfter: Duration.days(7),
    },
    {
      id: 'IntelligentTiering',
      transitions: [{
        storageClass: s3.StorageClass.INTELLIGENT_TIERING,
        transitionAfter: Duration.days(0),
      }],
    },
  ],
  cors: [{
    allowedOrigins: [`https://app-${environment}.memorygame.com`],
    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
    allowedHeaders: ['*'],
    maxAge: 3600,
  }],
  removalPolicy: RemovalPolicy.RETAIN,
});
```

**Integration Points**:
- CMS Service Lambda (upload/manage images)
- CloudFront Assets Distribution (origin)

#### 2. User Assets Bucket
**Logical Component**: User profile pictures storage
**AWS Service**: S3 Bucket
**CDK Construct**: `s3.Bucket`
**Configuration**:
```typescript
const userAssetsBucket = new s3.Bucket(this, 'UserAssetsBucket', {
  bucketName: `memory-game-user-assets-${environment}`,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: false,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  lifecycleRules: [
    {
      id: 'DeleteInactiveObjects',
      expiration: Duration.days(90),
    },
  ],
  cors: [{
    allowedOrigins: [`https://app-${environment}.memorygame.com`],
    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
    allowedHeaders: ['*'],
    maxAge: 3600,
  }],
  removalPolicy: RemovalPolicy.RETAIN,
});
```

**Integration Points**:
- Auth Service Lambda (upload profile pictures)
- CloudFront Assets Distribution (origin)


#### 3. Web Frontend Bucket
**Logical Component**: Static web application hosting
**AWS Service**: S3 Bucket
**CDK Construct**: `s3.Bucket`
**Configuration**:
```typescript
const webFrontendBucket = new s3.Bucket(this, 'WebFrontendBucket', {
  bucketName: `memory-game-web-frontend-${environment}`,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  websiteIndexDocument: 'index.html',
  websiteErrorDocument: 'index.html', // SPA routing
  removalPolicy: RemovalPolicy.RETAIN,
});
```

**Integration Points**:
- CloudFront Web Distribution (origin)
- CI/CD pipeline (deployment)

---

## CDN Layer Mapping

### CloudFront Distributions (CDN Stack)

#### 1. Web Frontend Distribution
**Logical Component**: Web application CDN
**AWS Service**: CloudFront Distribution
**CDK Construct**: `cloudfront.Distribution`
**Configuration**:
```typescript
const oai = new cloudfront.OriginAccessIdentity(this, 'WebOAI');
webFrontendBucket.grantRead(oai);

const webDistribution = new cloudfront.Distribution(this, 'WebDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(webFrontendBucket, {
      originAccessIdentity: oai,
    }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    compress: true,
  },
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
  enableLogging: true,
  certificate: certificate, // ACM certificate
  domainNames: [`app-${environment}.memorygame.com`],
  defaultRootObject: 'index.html',
  errorResponses: [
    {
      httpStatus: 404,
      responseHttpStatus: 200,
      responsePagePath: '/index.html', // SPA routing
      ttl: Duration.seconds(0),
    },
  ],
});
```

**Integration Points**:
- Web Frontend S3 Bucket (origin)
- Route 53 (DNS)
- ACM (SSL certificate)

#### 2. Assets Distribution
**Logical Component**: Theme images and user assets CDN
**AWS Service**: CloudFront Distribution
**CDK Construct**: `cloudfront.Distribution`
**Configuration**:
```typescript
const assetsOai = new cloudfront.OriginAccessIdentity(this, 'AssetsOAI');
themeImagesBucket.grantRead(assetsOai);
userAssetsBucket.grantRead(assetsOai);

const assetsDistribution = new cloudfront.Distribution(this, 'AssetsDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(themeImagesBucket, {
      originAccessIdentity: assetsOai,
    }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
    cachePolicy: new cloudfront.CachePolicy(this, 'AssetsCachePolicy', {
      defaultTtl: Duration.days(30),
      maxTtl: Duration.days(365),
      minTtl: Duration.days(1),
    }),
    compress: true,
  },
  additionalBehaviors: {
    '/user-assets/*': {
      origin: new origins.S3Origin(userAssetsBucket, {
        originAccessIdentity: assetsOai,
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
    },
  },
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
  certificate: certificate,
  domainNames: [`assets-${environment}.memorygame.com`],
});
```

**Integration Points**:
- Theme Images S3 Bucket (origin)
- User Assets S3 Bucket (origin)
- Route 53 (DNS)
- ACM (SSL certificate)

---

## Monitoring Layer Mapping

### CloudWatch Resources (Monitoring Stack)

#### Log Groups
**Logical Component**: Centralized logging
**AWS Service**: CloudWatch Log Groups
**CDK Construct**: `logs.LogGroup`
**Configuration**:
```typescript
// Lambda log groups (auto-created by Lambda)
// API Gateway log group
const apiLogGroup = new logs.LogGroup(this, 'ApiLogs', {
  logGroupName: `/aws/apigateway/memory-game-api-${environment}`,
  retention: logs.RetentionDays.ONE_MONTH,
  removalPolicy: RemovalPolicy.DESTROY,
});
```

**Integration Points**:
- All Lambda functions (automatic)
- API Gateway (access logs)
- CloudWatch Insights (log analysis)


#### CloudWatch Alarms
**Logical Component**: Alerting and notifications
**AWS Service**: CloudWatch Alarms + SNS
**CDK Construct**: `cloudwatch.Alarm` + `sns.Topic`
**Configuration**:
```typescript
// SNS topic for alerts
const alertTopic = new sns.Topic(this, 'AlertTopic', {
  topicName: `memory-game-alerts-${environment}`,
});
alertTopic.addSubscription(
  new subscriptions.EmailSubscription('ops@example.com')
);

// Lambda error alarms (per service)
new cloudwatch.Alarm(this, 'AuthServiceErrorAlarm', {
  alarmName: `auth-service-errors-${environment}`,
  metric: authServiceLambda.metricErrors({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
}).addAlarmAction(new actions.SnsAction(alertTopic));

// Lambda duration alarms (per service)
new cloudwatch.Alarm(this, 'AuthServiceDurationAlarm', {
  alarmName: `auth-service-duration-${environment}`,
  metric: authServiceLambda.metricDuration({
    statistic: 'Maximum',
    period: Duration.minutes(5),
  }),
  threshold: 25000, // 25 seconds
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
}).addAlarmAction(new actions.SnsAction(alertTopic));

// API Gateway 5xx alarm
new cloudwatch.Alarm(this, 'Api5xxAlarm', {
  alarmName: `api-5xx-errors-${environment}`,
  metric: api.metric5XXError({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 50,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
}).addAlarmAction(new actions.SnsAction(alertTopic));

// DynamoDB throttle alarms (per table)
new cloudwatch.Alarm(this, 'UsersTableThrottleAlarm', {
  alarmName: `users-table-throttles-${environment}`,
  metric: usersTable.metricUserErrors({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
}).addAlarmAction(new actions.SnsAction(alertTopic));
```

**Integration Points**:
- All Lambda functions (error and duration metrics)
- API Gateway (5xx errors, latency)
- DynamoDB tables (throttle metrics)
- SNS (email notifications)

---

## Security Layer Mapping

### IAM Roles and Policies

**Logical Component**: Access control and permissions
**AWS Service**: IAM Roles and Policies
**CDK Construct**: `iam.Role` + `iam.PolicyStatement`
**Configuration**:
```typescript
// Lambda execution roles (auto-created by CDK)
// Additional permissions granted via:
// - table.grantReadWriteData(lambda)
// - bucket.grantReadWrite(lambda)
// - secret.grantRead(lambda)

// CloudFront OAI (auto-created by CDK)
// S3 bucket policies (auto-created by CDK)
```

**Principle**: Least privilege - each Lambda function has minimal permissions

### Secrets Manager

**Logical Component**: Secret storage for API keys
**AWS Service**: Secrets Manager
**CDK Construct**: `secretsmanager.Secret`
**Configuration**:
```typescript
// Stripe API keys (created manually, referenced in CDK)
const stripeSecretKey = secretsmanager.Secret.fromSecretNameV2(
  this,
  'StripeSecretKey',
  `${environment}/stripe/secret-key`
);

const stripeWebhookSecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'StripeWebhookSecret',
  `${environment}/stripe/webhook-secret`
);
```

**Integration Points**:
- Payment Service Lambda (read Stripe keys)

---

## Cost Breakdown by Service

| AWS Service | Monthly Cost (Low Traffic) | Scaling Factor |
|-------------|---------------------------|----------------|
| DynamoDB (8 tables) | $10-50 | Pay per request |
| Lambda (6 functions) | $5-20 | Pay per invocation |
| API Gateway | $3-10 | Pay per request |
| S3 (3 buckets) | $1-5 | Pay per GB stored |
| CloudFront (2 distributions) | $5-15 | Pay per GB transferred |
| Cognito | Free | Up to 50K MAUs |
| CloudWatch | $5-10 | Pay per GB ingested |
| Secrets Manager | $1 | $0.40 per secret |
| **Total** | **$30-110/month** | Scales with usage |

**Note**: Costs scale linearly with traffic. At 1,000 concurrent users, expect $100-200/month.

---

## Infrastructure Design Summary

**Total AWS Resources**: 50+
- **Data Layer**: 8 DynamoDB tables with GSIs and TTL
- **Compute Layer**: 6 Lambda functions with reserved concurrency
- **API Layer**: 1 API Gateway HTTP API with Cognito authorizer
- **Auth Layer**: 1 Cognito User Pool with MFA and triggers
- **Storage Layer**: 3 S3 buckets with encryption and lifecycle policies
- **CDN Layer**: 2 CloudFront distributions with caching and compression
- **Monitoring Layer**: 7 log groups, 15+ alarms, 1 SNS topic
- **Security Layer**: 8+ IAM roles, 2 secrets, encryption everywhere

**Deployment Model**: 7 independent CDK stacks with cross-stack references
**Environment Strategy**: Single account, multiple stacks (dev, staging, prod)
**Security**: Least privilege IAM, encryption at rest and in transit, HTTPS only
**Monitoring**: Comprehensive CloudWatch logs, metrics, and alarms
**Cost**: ~$30-110/month for MVP, scales with usage

