# Data Access - Authentication Service

## Overview
This document defines the data access layer for the Authentication Service, including repository patterns, DynamoDB operations, and AWS Cognito integration.

---

## Repository Architecture

```
AuthService
    ↓
├── CognitoClient
│   └── AWS Cognito User Pool operations
├── UserRepository
│   └── DynamoDB Users table operations
└── UserSettingsRepository
    └── DynamoDB UserSettings table operations
```

---

## CognitoClient

### Purpose
Wrapper for AWS Cognito User Pool operations

### Methods

#### signUp(email, password, name): Promise<CognitoUser>
**Purpose**: Create new Cognito user

**Cognito Operation**: `AdminCreateUser` or `SignUp`

**Parameters**:
- email: User email address
- password: User password
- name: User display name

**Returns**: Cognito user object with userId (sub)

**Error Handling**:
- `UsernameExistsException`: Email already registered
- `InvalidPasswordException`: Password doesn't meet policy

---

#### confirmSignUp(email, code): Promise<void>
**Purpose**: Confirm email verification

**Cognito Operation**: `ConfirmSignUp`

**Parameters**:
- email: User email
- code: Verification code from email

**Error Handling**:
- `CodeMismatchException`: Invalid code
- `ExpiredCodeException`: Code expired

---

#### initiateAuth(email, password): Promise<AuthTokens>
**Purpose**: Authenticate user and get tokens

**Cognito Operation**: `InitiateAuth` with `USER_PASSWORD_AUTH`

**Parameters**:
- email: User email
- password: User password

**Returns**: Access token, refresh token, expires in

**Error Handling**:
- `NotAuthorizedException`: Invalid credentials
- `UserNotConfirmedException`: Email not verified
- `TooManyRequestsException`: Rate limit exceeded

---

#### adminInitiateAuth(userId): Promise<AuthTokens>
**Purpose**: Generate tokens for social login

**Cognito Operation**: `AdminInitiateAuth`

**Parameters**:
- userId: Cognito user ID (sub)

**Returns**: Access token, refresh token, expires in

---

#### globalSignOut(accessToken): Promise<void>
**Purpose**: Invalidate all user tokens

**Cognito Operation**: `GlobalSignOut`

**Parameters**:
- accessToken: User's access token

---

#### forgotPassword(email): Promise<void>
**Purpose**: Send password reset email

**Cognito Operation**: `ForgotPassword`

**Parameters**:
- email: User email

---

#### confirmForgotPassword(email, code, newPassword): Promise<void>
**Purpose**: Reset password with code

**Cognito Operation**: `ConfirmForgotPassword`

**Parameters**:
- email: User email
- code: Reset code from email
- newPassword: New password

**Error Handling**:
- `CodeMismatchException`: Invalid code
- `ExpiredCodeException`: Code expired
- `InvalidPasswordException`: Password doesn't meet policy

---

#### refreshTokens(refreshToken): Promise<AuthTokens>
**Purpose**: Refresh access token

**Cognito Operation**: `InitiateAuth` with `REFRESH_TOKEN_AUTH`

**Parameters**:
- refreshToken: User's refresh token

**Returns**: New access token, new refresh token, expires in

**Error Handling**:
- `NotAuthorizedException`: Invalid refresh token

---

#### getUser(accessToken): Promise<CognitoUser>
**Purpose**: Get user info from token

**Cognito Operation**: `GetUser`

**Parameters**:
- accessToken: User's access token

**Returns**: Cognito user attributes

---

#### validateSocialToken(provider, token): Promise<SocialUserInfo>
**Purpose**: Validate social provider token

**Implementation**:
- Google: Call Google OAuth2 API
- Facebook: Call Facebook Graph API
- Apple: Validate Apple Sign In token (future)

**Returns**: User info (email, name, picture)

**Error Handling**:
- Invalid token: Throw error
- Provider API error: Throw error

---

## UserRepository

### Purpose
Data access for DynamoDB Users table

### Table Schema
```typescript
{
  userId: string;        // Partition key (Cognito sub)
  email: string;         // GSI: EmailIndex
  cognitoId: string;     // GSI: CognitoIdIndex
  name: string;
  profilePictureUrl?: string;
  role: 'USER' | 'ADMIN';
  tier: 'FREE' | 'LIGHT' | 'STANDARD' | 'PREMIUM';
  emailVerified: boolean;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  lastLoginAt?: string;  // ISO 8601
}
```

### Methods

#### create(user: User): Promise<User>
**Purpose**: Create new user record

**DynamoDB Operation**: `PutItem`

**Parameters**:
- user: Complete User object

**Returns**: Created user

**Validation**:
- userId must be unique
- Email must be unique (check EmailIndex GSI first)

**Error Handling**:
- `ConditionalCheckFailedException`: User already exists

---

#### findById(userId: string): Promise<User | null>
**Purpose**: Find user by ID

**DynamoDB Operation**: `GetItem`

**Parameters**:
- userId: User ID (Cognito sub)

**Returns**: User object or null if not found

---

#### findByEmail(email: string): Promise<User | null>
**Purpose**: Find user by email

**DynamoDB Operation**: `Query` on EmailIndex GSI

**Parameters**:
- email: User email

**Returns**: User object or null if not found

---

#### findByCognitoId(cognitoId: string): Promise<User | null>
**Purpose**: Find user by Cognito ID

**DynamoDB Operation**: `Query` on CognitoIdIndex GSI

**Parameters**:
- cognitoId: Cognito user ID

**Returns**: User object or null if not found

---

#### update(userId: string, updates: Partial<User>): Promise<User>
**Purpose**: Update user fields

**DynamoDB Operation**: `UpdateItem`

**Parameters**:
- userId: User ID
- updates: Fields to update

**Returns**: Updated user

**Updatable Fields**:
- name
- profilePictureUrl
- emailVerified
- lastLoginAt
- updatedAt (auto-set)

**Non-Updatable Fields**:
- userId
- email
- cognitoId
- role (requires admin)
- tier (via subscription service)
- createdAt

---

#### updateLastLogin(userId: string): Promise<void>
**Purpose**: Update lastLoginAt timestamp

**DynamoDB Operation**: `UpdateItem`

**Parameters**:
- userId: User ID

**Sets**: lastLoginAt to current timestamp

---

#### delete(userId: string): Promise<void>
**Purpose**: Delete user (soft delete or hard delete)

**DynamoDB Operation**: `DeleteItem`

**Parameters**:
- userId: User ID

**Note**: Consider soft delete (set deletedAt field) instead of hard delete for audit trail

---

## UserSettingsRepository

### Purpose
Data access for DynamoDB UserSettings table

### Table Schema
```typescript
{
  userId: string;                  // Partition key
  soundEffectsEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;             // 0-100
  musicVolume: number;             // 0-100
  notificationsEnabled: boolean;
  language: string;                // ISO 639-1 code
  theme: string;                   // 'light' | 'dark'
  autoProgressDifficulty: boolean;
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}
```

### Methods

#### create(userId: string): Promise<UserSettings>
**Purpose**: Create default settings for new user

**DynamoDB Operation**: `PutItem`

**Parameters**:
- userId: User ID

**Default Values**:
```typescript
{
  soundEffectsEnabled: true,
  musicEnabled: true,
  soundVolume: 70,
  musicVolume: 50,
  notificationsEnabled: true,
  language: 'en',
  theme: 'light',
  autoProgressDifficulty: false,
}
```

**Returns**: Created settings

---

#### findById(userId: string): Promise<UserSettings | null>
**Purpose**: Get user settings

**DynamoDB Operation**: `GetItem`

**Parameters**:
- userId: User ID

**Returns**: UserSettings object or null if not found

---

#### update(userId: string, updates: Partial<UserSettings>): Promise<UserSettings>
**Purpose**: Update user settings

**DynamoDB Operation**: `UpdateItem`

**Parameters**:
- userId: User ID
- updates: Fields to update

**Returns**: Updated settings

**Updatable Fields**: All fields except userId, createdAt

---

## Data Access Patterns

### User Registration Flow
```typescript
// 1. Create Cognito user
const cognitoUser = await cognitoClient.signUp(email, password, name);

// 2. Create DynamoDB user record
const user = await userRepository.create({
  userId: cognitoUser.sub,
  email,
  cognitoId: cognitoUser.sub,
  name,
  role: 'USER',
  tier: 'FREE',
  emailVerified: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// 3. Create default settings
const settings = await userSettingsRepository.create(user.userId);

// 4. Generate tokens
const tokens = await cognitoClient.adminInitiateAuth(user.userId);

return { user, ...tokens };
```

### User Login Flow
```typescript
// 1. Authenticate with Cognito
const tokens = await cognitoClient.initiateAuth(email, password);

// 2. Get user from DynamoDB
const user = await userRepository.findByEmail(email);

// 3. Update last login
await userRepository.updateLastLogin(user.userId);

return { user, ...tokens };
```

### Social Login Flow
```typescript
// 1. Validate social token
const socialInfo = await cognitoClient.validateSocialToken(provider, token);

// 2. Check if user exists
let user = await userRepository.findByEmail(socialInfo.email);

if (!user) {
  // 3a. Create Cognito user (federated)
  const cognitoUser = await cognitoClient.createFederatedUser(socialInfo);
  
  // 3b. Create DynamoDB user
  user = await userRepository.create({
    userId: cognitoUser.sub,
    email: socialInfo.email,
    cognitoId: cognitoUser.sub,
    name: socialInfo.name,
    profilePictureUrl: socialInfo.picture,
    role: 'USER',
    tier: 'FREE',
    emailVerified: true, // Social accounts auto-verified
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // 3c. Create default settings
  await userSettingsRepository.create(user.userId);
}

// 4. Generate tokens
const tokens = await cognitoClient.adminInitiateAuth(user.userId);

// 5. Update last login
await userRepository.updateLastLogin(user.userId);

return { user, ...tokens };
```

### Get Current User Flow
```typescript
// 1. Get user from Cognito token
const cognitoUser = await cognitoClient.getUser(accessToken);

// 2. Get user from DynamoDB
const user = await userRepository.findById(cognitoUser.sub);

// 3. Get user settings
const settings = await userSettingsRepository.findById(user.userId);

return { ...user, settings };
```

---

## Error Handling

### Repository Error Mapping
```typescript
try {
  // DynamoDB operation
} catch (error) {
  if (error.name === 'ConditionalCheckFailedException') {
    throw new Error('RESOURCE_ALREADY_EXISTS');
  }
  if (error.name === 'ResourceNotFoundException') {
    throw new Error('RESOURCE_NOT_FOUND');
  }
  if (error.name === 'ProvisionedThroughputExceededException') {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }
  throw error; // Unknown error
}
```

### Cognito Error Mapping
```typescript
try {
  // Cognito operation
} catch (error) {
  if (error.name === 'UsernameExistsException') {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }
  if (error.name === 'UserNotFoundException') {
    throw new Error('USER_NOT_FOUND');
  }
  if (error.name === 'NotAuthorizedException') {
    throw new Error('INVALID_CREDENTIALS');
  }
  // ... other mappings
  throw error; // Unknown error
}
```

---

## Performance Considerations

### DynamoDB
- Use GSIs for email and cognitoId lookups
- Batch operations where possible
- Use consistent reads only when necessary
- Cache user data in Lambda memory (with TTL)

### Cognito
- Cache Cognito responses in Lambda memory
- Use connection pooling for Cognito SDK
- Implement retry logic with exponential backoff

---

## Security Considerations

### Data Protection
- Never store passwords in DynamoDB (Cognito only)
- Encrypt sensitive fields at application level if needed
- Use IAM roles for Lambda access to DynamoDB
- Use Secrets Manager for Cognito client secrets

### Access Control
- Lambda has read/write access to Users and UserSettings tables only
- No direct DynamoDB access from frontend
- All operations authenticated via Cognito tokens

---

## Summary

**Repositories**: 3 (CognitoClient, UserRepository, UserSettingsRepository)
**DynamoDB Tables**: 2 (Users, UserSettings)
**GSIs**: 2 (EmailIndex, CognitoIdIndex on Users table)
**Data Access Patterns**: 4 main flows (registration, login, social login, get user)
**Error Handling**: Cognito and DynamoDB error mapping
**Security**: IAM roles, no password storage, token-based auth

