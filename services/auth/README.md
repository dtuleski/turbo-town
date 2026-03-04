# Authentication Service

GraphQL-based authentication service for the Memory Game application, handling user registration, login, social authentication, password reset, and profile management.

## Overview

The Authentication Service provides secure user authentication using AWS Cognito for identity management and DynamoDB for user data storage. It supports email/password authentication, social login (Google, Facebook), and comprehensive user profile management.

## Features

- **User Registration**: Email/password registration with email verification
- **Social Login**: OAuth integration with Google and Facebook
- **User Login**: Secure email/password authentication with JWT tokens
- **Password Reset**: Forgot password flow with email verification codes
- **Token Management**: JWT access tokens with refresh token support
- **Profile Management**: Update user profile information
- **Session Management**: Global sign-out across all devices

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GraphQL
       ▼
┌─────────────────────────────────────┐
│      API Gateway + Lambda           │
│  ┌───────────────────────────────┐  │
│  │     Auth Handler              │  │
│  │  (GraphQL Resolvers)          │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │     Auth Service              │  │
│  │  (Business Logic)             │  │
│  └───┬───────────────────┬───────┘  │
│      │                   │           │
│  ┌───▼────────┐   ┌─────▼────────┐  │
│  │  Cognito   │   │  DynamoDB    │  │
│  │  Client    │   │  Repositories│  │
│  └────────────┘   └──────────────┘  │
└─────────────────────────────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐   ┌──────────────┐
│   Cognito   │   │  DynamoDB    │
│  User Pool  │   │    Tables    │
└─────────────┘   └──────────────┘
```

## Technology Stack

- **Runtime**: Node.js 20.x
- **Language**: TypeScript
- **Framework**: AWS Lambda
- **API**: GraphQL
- **Authentication**: AWS Cognito
- **Database**: DynamoDB
- **Testing**: Jest
- **Linting**: ESLint + Prettier

## Project Structure

```
services/auth/
├── src/
│   ├── handlers/          # GraphQL resolvers
│   │   └── auth.handler.ts
│   ├── services/          # Business logic
│   │   └── auth.service.ts
│   ├── repositories/      # Data access layer
│   │   ├── cognito.client.ts
│   │   ├── user.repository.ts
│   │   └── user-settings.repository.ts
│   ├── utils/             # Utilities
│   │   ├── validation.ts
│   │   ├── error-mapper.ts
│   │   ├── token.ts
│   │   ├── logger.ts
│   │   └── metrics.ts
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   └── index.ts           # Lambda handler
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests
│   └── helpers/           # Test utilities
├── scripts/               # Build and deployment scripts
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Setup

### Prerequisites

- Node.js 20.x or later
- AWS CLI configured
- AWS Cognito User Pool created
- DynamoDB tables created (Users, UserSettings)

### Installation

```bash
cd services/auth
npm install
```

### Environment Variables

Create a `.env` file (for local development):

```bash
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
DYNAMODB_USERS_TABLE=memory-game-users-dev
DYNAMODB_USER_SETTINGS_TABLE=memory-game-user-settings-dev
NODE_ENV=development
AWS_REGION=us-east-1
```

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# With coverage
npm run test:coverage
```

### Linting

```bash
# Check for issues
npm run lint

# Fix issues automatically
npm run lint:fix
```

### Formatting

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

## GraphQL API

### Mutations

#### register
Register a new user with email and password.

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    user {
      id
      email
      name
      role
      tier
    }
    accessToken
    refreshToken
    expiresIn
  }
}
```

**Input**:
```json
{
  "input": {
    "email": "user@example.com",
    "password": "Password123",
    "displayName": "John Doe"
  }
}
```

#### loginWithSocial
Login or register using social provider (Google, Facebook).

```graphql
mutation LoginWithSocial($input: LoginWithSocialInput!) {
  loginWithSocial(input: $input) {
    user {
      id
      email
      name
    }
    accessToken
    refreshToken
    expiresIn
  }
}
```

#### login
Login with email and password.

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    user {
      id
      email
      name
    }
    accessToken
    refreshToken
    expiresIn
  }
}
```

#### logout
Sign out from all devices.

```graphql
mutation Logout {
  logout
}
```

#### requestPasswordReset
Request password reset email.

```graphql
mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
  requestPasswordReset(input: $input)
}
```

#### confirmPasswordReset
Confirm password reset with code.

```graphql
mutation ConfirmPasswordReset($input: ConfirmPasswordResetInput!) {
  confirmPasswordReset(input: $input)
}
```

#### refreshToken
Refresh access token.

```graphql
mutation RefreshToken($input: RefreshTokenInput!) {
  refreshToken(input: $input) {
    accessToken
    refreshToken
    expiresIn
  }
}
```

#### updateProfile
Update user profile.

```graphql
mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    id
    name
    profilePictureUrl
  }
}
```

### Queries

#### getCurrentUser
Get currently authenticated user.

```graphql
query GetCurrentUser {
  getCurrentUser {
    id
    email
    name
    role
    tier
    emailVerified
  }
}
```

#### verifyEmail
Verify email with code.

```graphql
query VerifyEmail($input: VerifyEmailInput!) {
  verifyEmail(input: $input) {
    id
    emailVerified
  }
}
```

## Deployment

### Build Deployment Package

```bash
./scripts/build.sh
```

### Deploy to Environment

```bash
# Development
npm run deploy:dev

# Staging
npm run deploy:staging

# Production
npm run deploy:prod
```

## Monitoring

### CloudWatch Metrics

- `RequestCount`: Total number of requests
- `ErrorCount`: Total number of errors
- `Latency`: Request latency (p50, p95, p99)
- `TokenGenerationTime`: Time to generate tokens
- `CognitoOperationTime`: Time for Cognito operations
- `DynamoDBOperationTime`: Time for DynamoDB operations
- `RegistrationCount`: Number of registrations
- `LoginCount`: Number of successful logins
- `FailedLoginCount`: Number of failed logins
- `PasswordResetCount`: Number of password resets

### CloudWatch Alarms

- Error rate > 5%
- Latency p99 > 1s
- Lambda errors > 10 in 5 minutes
- Lambda duration > 25 seconds

### CloudWatch Logs

All requests are logged with:
- Correlation ID
- User ID (if authenticated)
- Operation name
- Request/response details
- Error stack traces

## Security

### Authentication

- JWT tokens issued by AWS Cognito
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Tokens validated on every request

### Password Policy

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

### Rate Limiting

- Cognito: 5 failed login attempts = 1 hour account lock
- API Gateway: 100 requests/second per user
- Password reset: 3 requests/hour per email

### Data Protection

- Passwords never stored (Cognito only)
- Sensitive data encrypted at rest (DynamoDB)
- HTTPS only for all communication
- CORS enabled for web frontend

## Troubleshooting

### Common Issues

**Issue**: "COGNITO_USER_POOL_ID must be set"
**Solution**: Ensure environment variables are configured

**Issue**: "User not found"
**Solution**: User may not exist or email not verified

**Issue**: "Invalid email or password"
**Solution**: Check credentials or account may be locked

**Issue**: "Token has expired"
**Solution**: Use refresh token to get new access token

### Debug Mode

Set `NODE_ENV=development` to enable debug logging.

## Contributing

1. Create feature branch
2. Write tests (80%+ coverage required)
3. Run linting and formatting
4. Submit pull request

## License

MIT
