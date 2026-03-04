# API Contracts - Authentication Service

## Overview
This document defines the GraphQL API contracts for the Authentication Service, including mutations, queries, types, and error handling.

---

## GraphQL Schema

### Mutations

#### register
Register a new user with email and password.

```graphql
type Mutation {
  register(input: RegisterInput!): AuthPayload!
}

input RegisterInput {
  email: String!
  password: String!
  name: String!
}

type AuthPayload {
  user: User!
  accessToken: String!
  refreshToken: String!
  expiresIn: Int!
}
```

**Business Rules**:
- Email must be unique
- Password must meet policy (min 8 chars, uppercase, lowercase, digit)
- Email verification required before login
- Returns tokens but user must verify email to use them

**Errors**:
- `EMAIL_ALREADY_EXISTS` - Email is already registered
- `INVALID_PASSWORD` - Password doesn't meet requirements
- `VALIDATION_ERROR` - Input validation failed

---

#### loginWithSocial
Register or login using social provider (Google, Facebook).

```graphql
type Mutation {
  loginWithSocial(input: SocialLoginInput!): AuthPayload!
}

input SocialLoginInput {
  provider: SocialProvider!
  token: String!
}

enum SocialProvider {
  GOOGLE
  FACEBOOK
  APPLE
}
```

**Business Rules**:
- If user exists, login and return tokens
- If user doesn't exist, create account and return tokens
- Social accounts are auto-verified (no email verification needed)
- Profile data populated from social provider

**Errors**:
- `INVALID_SOCIAL_TOKEN` - Token validation failed
- `SOCIAL_PROVIDER_ERROR` - Provider API error

---

#### login
Login with email and password.

```graphql
type Mutation {
  login(input: LoginInput!): AuthPayload!
}

input LoginInput {
  email: String!
  password: String!
  rememberMe: Boolean
}
```

**Business Rules**:
- Email must be verified
- Account locked after 5 failed attempts
- Session duration: 30 days if rememberMe=true, 1 day otherwise
- Returns access token (1h) and refresh token

**Errors**:
- `INVALID_CREDENTIALS` - Email or password incorrect
- `EMAIL_NOT_VERIFIED` - Account exists but email not verified
- `ACCOUNT_LOCKED` - Too many failed login attempts
- `USER_NOT_FOUND` - No account with this email

---

#### logout
Logout current user and invalidate tokens.

```graphql
type Mutation {
  logout: Boolean!
}
```

**Business Rules**:
- Invalidates current access and refresh tokens
- Requires valid access token in Authorization header
- Always returns true (idempotent)

---

#### requestPasswordReset
Request password reset email.

```graphql
type Mutation {
  requestPasswordReset(email: String!): Boolean!
}
```

**Business Rules**:
- Sends password reset email if account exists
- Reset link expires after 1 hour
- Always returns true (security - don't reveal if email exists)
- Rate limited to prevent abuse

---

#### confirmPasswordReset
Confirm password reset with code and new password.

```graphql
type Mutation {
  confirmPasswordReset(input: PasswordResetInput!): Boolean!
}

input PasswordResetInput {
  email: String!
  code: String!
  newPassword: String!
}
```

**Business Rules**:
- Code must be valid and not expired
- New password must meet policy
- Old password invalidated
- Confirmation email sent
- All sessions invalidated (user must login again)

**Errors**:
- `INVALID_RESET_CODE` - Code is invalid or expired
- `INVALID_PASSWORD` - New password doesn't meet requirements

---

#### refreshToken
Refresh access token using refresh token.

```graphql
type Mutation {
  refreshToken(refreshToken: String!): AuthPayload!
}
```

**Business Rules**:
- Refresh token must be valid and not expired
- Returns new access token and refresh token
- Old refresh token invalidated

**Errors**:
- `INVALID_REFRESH_TOKEN` - Token is invalid or expired
- `USER_NOT_FOUND` - User no longer exists

---

#### updateProfile
Update user profile information.

```graphql
type Mutation {
  updateProfile(input: UpdateProfileInput!): User!
}

input UpdateProfileInput {
  name: String
  profilePictureUrl: String
}
```

**Business Rules**:
- Requires valid access token
- Only updates provided fields
- Profile picture URL must be valid S3 URL

**Errors**:
- `UNAUTHORIZED` - No valid access token
- `VALIDATION_ERROR` - Invalid input

---

### Queries

#### getCurrentUser
Get current authenticated user.

```graphql
type Query {
  getCurrentUser: User!
}
```

**Business Rules**:
- Requires valid access token in Authorization header
- Returns complete user profile with settings

**Errors**:
- `UNAUTHORIZED` - No valid access token
- `USER_NOT_FOUND` - User no longer exists

---

#### verifyEmail
Verify email address with verification code.

```graphql
type Query {
  verifyEmail(code: String!): Boolean!
}
```

**Business Rules**:
- Code must be valid and not expired (24h)
- Marks email as verified
- User can now login
- Returns true on success

**Errors**:
- `INVALID_VERIFICATION_CODE` - Code is invalid or expired
- `EMAIL_ALREADY_VERIFIED` - Email already verified

---

## Types

### User
```graphql
type User {
  userId: ID!
  email: String!
  name: String!
  profilePictureUrl: String
  role: UserRole!
  tier: SubscriptionTier!
  emailVerified: Boolean!
  createdAt: String!
  updatedAt: String!
  lastLoginAt: String
  settings: UserSettings!
}

enum UserRole {
  USER
  ADMIN
}

enum SubscriptionTier {
  FREE
  LIGHT
  STANDARD
  PREMIUM
}
```

### UserSettings
```graphql
type UserSettings {
  soundEffectsEnabled: Boolean!
  musicEnabled: Boolean!
  soundVolume: Int!
  musicVolume: Int!
  notificationsEnabled: Boolean!
  language: String!
  theme: String!
  autoProgressDifficulty: Boolean!
}
```

---

## Error Handling

All mutations and queries follow the Result pattern from Shared Components:

```graphql
type AuthPayload {
  user: User
  accessToken: String
  refreshToken: String
  expiresIn: Int
  error: Error
}

type Error {
  code: String!
  message: String!
  field: String
}
```

**Common Error Codes**:
- `UNAUTHORIZED` - No valid authentication
- `VALIDATION_ERROR` - Input validation failed
- `USER_NOT_FOUND` - User doesn't exist
- `EMAIL_ALREADY_EXISTS` - Email already registered
- `INVALID_CREDENTIALS` - Login failed
- `EMAIL_NOT_VERIFIED` - Email verification required
- `ACCOUNT_LOCKED` - Too many failed attempts
- `INVALID_PASSWORD` - Password doesn't meet requirements
- `INVALID_RESET_CODE` - Password reset code invalid
- `INVALID_REFRESH_TOKEN` - Refresh token invalid
- `INVALID_SOCIAL_TOKEN` - Social login token invalid
- `SOCIAL_PROVIDER_ERROR` - Social provider API error

---

## Authentication Flow

### Registration Flow
1. Client calls `register` mutation
2. Service validates input
3. Service creates Cognito user
4. Service sends verification email
5. Service creates DynamoDB user record
6. Service returns tokens (but user can't use until verified)
7. User clicks verification link
8. Client calls `verifyEmail` query
9. User can now login

### Login Flow
1. Client calls `login` mutation
2. Service validates credentials with Cognito
3. Service checks email verification status
4. Service generates tokens
5. Service updates lastLoginAt in DynamoDB
6. Service returns tokens

### Social Login Flow
1. Client gets social provider token (OAuth)
2. Client calls `loginWithSocial` mutation
3. Service validates token with provider
4. Service checks if user exists (by email)
5. If exists: login, if not: create account
6. Service returns tokens

### Password Reset Flow
1. Client calls `requestPasswordReset` mutation
2. Service sends reset email with code
3. User clicks reset link
4. Client calls `confirmPasswordReset` mutation
5. Service validates code and updates password
6. Service invalidates all sessions
7. User must login again

---

## Summary

**Total Operations**: 11 (8 mutations, 3 queries)
**Authentication**: JWT tokens via AWS Cognito
**Session Management**: Cognito-managed with refresh tokens
**Error Handling**: Result pattern with typed error codes
**Security**: Email verification, rate limiting, account locking, password policy

