# AWS Service Configurations - Infrastructure

## Overview
This document provides specific AWS service configurations to implement the infrastructure patterns and meet NFR requirements.

**Configuration Approach**: Use AWS best practices with MVP-appropriate settings
**Philosophy**: Start simple, optimize based on monitoring

---

## DynamoDB Configuration

### Table Configuration Template
```typescript
const table = new dynamodb.Table(this, 'TableName', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand
  encryption: dynamodb.TableEncryption.AWS_MANAGED,  // Encryption at rest
  pointInTimeRecovery: true,                         // PITR enabled
  removalPolicy: RemovalPolicy.RETAIN,               // Prevent accidental deletion
});
```

### Global Secondary Index Configuration
```typescript
table.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL, // Project all attributes
});
```

### Time-To-Live Configuration
```typescript
// For RateLimits table
table.addTimeToLive({
  attributeName: 'resetAt', // Automatic cleanup
});
```

---

## Lambda Configuration

### Function Configuration Template
```typescript
const lambda = new lambda.Function(this, 'ServiceFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('path/to/code'),
  memorySize: 512,                              // MB (adjust per service)
  timeout: Duration.seconds(30),                // Seconds
  reservedConcurrentExecutions: 100,            // Reserved capacity
  retryAttempts: 2,                             // Automatic retries
  environment: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'info',
    // Service-specific variables
  },
  logRetention: logs.RetentionDays.ONE_MONTH,   // 30 days
});
```

### Per-Service Memory Configuration
- **Auth Service**: 512 MB (authentication, token generation)
- **Game Service**: 512 MB (game logic, score calculation)
- **Leaderboard Service**: 256 MB (read-heavy queries)
- **Payment Service**: 512 MB (Stripe integration)
- **CMS Service**: 512 MB (theme management, S3 operations)
- **Admin Service**: 512 MB (admin operations, analytics)

### Dead Letter Queue Configuration
```typescript
const dlq = new sqs.Queue(this, 'DLQ', {
  retentionPeriod: Duration.days(14), // Keep failed messages for 14 days
});

lambda.addEventSourceMapping('DLQMapping', {
  eventSourceArn: dlq.queueArn,
  onFailure: new destinations.SqsDestination(dlq),
});
```

---

## API Gateway Configuration

### HTTP API Configuration
```typescript
const api = new apigateway.HttpApi(this, 'GraphQLApi', {
  apiName: 'memory-game-api',
  description: 'GraphQL API for memory game',
  corsPreflight: {
    allowOrigins: ['https://app.memorygame.com'], // Web frontend domain
    allowMethods: [apigateway.CorsHttpMethod.POST],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: Duration.hours(1),
  },
  defaultThrottle: {
    burstLimit: 1000, // Burst capacity
    rateLimit: 500,   // Steady-state rate
  },
});
```

### Cognito Authorizer Configuration
```typescript
const authorizer = new apigateway.HttpUserPoolAuthorizer({
  userPool: userPool,
  userPoolClient: userPoolClient,
  identitySource: ['$request.header.Authorization'],
});

api.addRoutes({
  path: '/graphql',
  methods: [apigateway.HttpMethod.POST],
  integration: new integrations.HttpLambdaIntegration('GraphQLIntegration', lambda),
  authorizer: authorizer,
});
```

### Logging Configuration
```typescript
const logGroup = new logs.LogGroup(this, 'ApiLogs', {
  retention: logs.RetentionDays.ONE_MONTH,
});

// Enable access logging
api.addStage('prod', {
  stageName: 'prod',
  throttle: {
    burstLimit: 1000,
    rateLimit: 500,
  },
  accessLogSettings: {
    destinationArn: logGroup.logGroupArn,
    format: apigateway.AccessLogFormat.jsonWithStandardFields(),
  },
});
```

---

## S3 Configuration

### Bucket Configuration Template
```typescript
const bucket = new s3.Bucket(this, 'BucketName', {
  encryption: s3.BucketEncryption.S3_MANAGED,    // AES-256
  versioned: true,                                // Enable versioning
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block public access
  enforceSSL: true,                               // Require HTTPS
  lifecycleRules: [
    {
      id: 'DeleteIncompleteUploads',
      abortIncompleteMultipartUploadAfter: Duration.days(7),
    },
  ],
  cors: [
    {
      allowedOrigins: ['https://app.memorygame.com'],
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
      allowedHeaders: ['*'],
      maxAge: 3600,
    },
  ],
  removalPolicy: RemovalPolicy.RETAIN,            // Prevent accidental deletion
});
```

### Intelligent-Tiering Configuration
```typescript
bucket.addLifecycleRule({
  id: 'IntelligentTiering',
  transitions: [
    {
      storageClass: s3.StorageClass.INTELLIGENT_TIERING,
      transitionAfter: Duration.days(0), // Immediate
    },
  ],
});
```

---

## CloudFront Configuration

### Distribution Configuration Template
```typescript
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket, {
      originAccessIdentity: oai,
    }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    compress: true, // Enable Gzip/Brotli
  },
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
  enableLogging: true,
  logBucket: logBucket,
  certificate: certificate, // ACM certificate (optional)
  domainNames: ['app.memorygame.com'], // Custom domain (optional)
});
```

### Cache Policy Configuration
```typescript
const cachePolicy = new cloudfront.CachePolicy(this, 'AssetsCachePolicy', {
  cachePolicyName: 'AssetsCachePolicy',
  defaultTtl: Duration.days(30),
  maxTtl: Duration.days(365),
  minTtl: Duration.days(1),
  enableAcceptEncodingGzip: true,
  enableAcceptEncodingBrotli: true,
});
```

---

## Cognito Configuration

### User Pool Configuration
```typescript
const userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: 'memory-game-users',
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
  mfa: cognito.Mfa.OPTIONAL, // Optional TOTP
  accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
  removalPolicy: RemovalPolicy.RETAIN,
});
```

### User Pool Client Configuration
```typescript
const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
  userPool: userPool,
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
  oAuth: {
    flows: {
      authorizationCodeGrant: true,
    },
    scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID],
    callbackUrls: ['https://app.memorygame.com/callback'],
  },
  accessTokenValidity: Duration.hours(1),
  refreshTokenValidity: Duration.days(30),
});
```

### Lambda Triggers Configuration
```typescript
userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpLambda);
userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationLambda);
```

---

## CloudWatch Configuration

### Log Group Configuration
```typescript
const logGroup = new logs.LogGroup(this, 'ServiceLogs', {
  logGroupName: '/aws/lambda/service-name',
  retention: logs.RetentionDays.ONE_MONTH,
  removalPolicy: RemovalPolicy.DESTROY, // Delete on stack deletion
});
```

### Alarm Configuration Templates

**Lambda Error Alarm**:
```typescript
new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  alarmName: 'service-lambda-errors',
  metric: lambda.metricErrors({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  actionsEnabled: true,
}).addAlarmAction(new actions.SnsAction(alertTopic));
```

**Lambda Duration Alarm**:
```typescript
new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
  alarmName: 'service-lambda-duration',
  metric: lambda.metricDuration({
    statistic: 'Maximum',
    period: Duration.minutes(5),
  }),
  threshold: 25000, // 25 seconds (approaching 30s timeout)
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
}).addAlarmAction(new actions.SnsAction(alertTopic));
```

**API Gateway 5xx Alarm**:
```typescript
new cloudwatch.Alarm(this, 'Api5xxAlarm', {
  alarmName: 'api-5xx-errors',
  metric: api.metric5XXError({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 50,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
}).addAlarmAction(new actions.SnsAction(alertTopic));
```

---

## IAM Configuration

### Lambda Execution Role Template
```typescript
const role = new iam.Role(this, 'LambdaExecutionRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
  ],
});

// Grant specific permissions
gamesTable.grantReadWriteData(role);
rateLimitsTable.grantReadWriteData(role);
```

### S3 Bucket Policy for CloudFront
```typescript
const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
bucket.grantRead(oai);

bucket.addToResourcePolicy(new iam.PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [bucket.arnForObjects('*')],
  principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
}));
```

---

## Configuration Summary

All configurations follow AWS best practices with MVP-appropriate settings:
- **DynamoDB**: On-demand, PITR enabled, encrypted
- **Lambda**: 512 MB default, 30s timeout, reserved concurrency
- **API Gateway**: 1K burst/500 steady throttling, Cognito auth
- **S3**: Encrypted, versioned, blocked public access
- **CloudFront**: HTTPS only, compression enabled, 30-day cache
- **Cognito**: Email verification, optional MFA, 1h access token
- **CloudWatch**: 30-day retention, comprehensive alarms
- **IAM**: Least privilege, no wildcards

**Next Step**: Generate AWS CDK TypeScript code implementing these configurations.
