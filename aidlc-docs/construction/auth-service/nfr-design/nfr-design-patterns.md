# NFR Design Patterns - Authentication Service

## Architecture Pattern
**Pattern**: Serverless microservice with AWS Lambda + API Gateway + Cognito + DynamoDB

## Code Organization
```
services/auth/
├── src/
│   ├── handlers/          # GraphQL resolvers
│   ├── services/          # Business logic (AuthService)
│   ├── repositories/      # Data access (CognitoClient, UserRepository)
│   ├── utils/             # Validation, error mapping
│   └── index.ts           # Lambda handler entry point
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── package.json
```

## Performance Patterns
- **Connection Pooling**: Reuse DynamoDB and Cognito SDK clients
- **Lambda Warm-up**: Keep instances warm with scheduled pings
- **Caching**: Cache user data in Lambda memory (5-min TTL)
- **Batch Operations**: Batch DynamoDB operations where possible

## Security Patterns
- **Input Validation**: Zod schemas from Shared Components
- **Error Sanitization**: Never expose internal errors to client
- **Token Validation**: Verify JWT signature and expiry
- **Rate Limiting**: API Gateway + Cognito built-in
- **Secrets Management**: AWS Secrets Manager for Cognito secrets

## Error Handling Patterns
- **Result Type**: Use Result<T, Error> from Shared Components
- **Error Mapping**: Map Cognito/DynamoDB errors to domain errors
- **Logging**: Log all errors with context
- **User-Friendly Messages**: Return clear error messages

## Testing Patterns
- **Unit Tests**: Mock all external dependencies
- **Integration Tests**: Use LocalStack for DynamoDB, mock Cognito
- **E2E Tests**: Test against real Cognito dev environment
- **Test Data**: Use factories for test data generation

## Monitoring Patterns
- **Structured Logging**: JSON logs with correlation IDs
- **Metrics**: Custom CloudWatch metrics for business events
- **Alarms**: CloudWatch alarms for errors and latency
- **Tracing**: X-Ray for distributed tracing

