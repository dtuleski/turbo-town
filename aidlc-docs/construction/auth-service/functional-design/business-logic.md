# Business Logic - Authentication Service

## Overview
This document defines the business logic layer for the Authentication Service, including service methods, validation rules, and business workflows.

---

## Service Layer Architecture

```
GraphQL Resolvers
    ↓
AuthService (business logic)
    ↓
├── CognitoClient (AWS Cognito operations)
├── UserRepository (DynamoDB Users table)
└── UserSettingsRepository (DynamoDB UserSettings table)
```

---

## AuthService Methods

### registerUser(input: RegisterInput): Result<AuthPayload>

**Purpose**: Register new user with email and password

**Business Logic**:
1. Validate input (email format, password strength)
2. Check if email already exists in Cognito
3. Create Cognito user with email and password
4. Send email verification
5. Create user record in DynamoDB Users table
6. Create default settings in DynamoDB UserSettings table
7. Generate tokens (access + refresh)
8. Return AuthPayload with tokens

**Validation Rules**:
- Email: Valid email format, max 255 chars
- Password: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit
- Name: Required, 1-100 chars

**Error Handling**:
- If email exists: Return `EMAIL_ALREADY_EXISTS` error
- If password invalid: Return `INVALID_PASSWORD` error
- If Cognito error: Map to appropriate error code
- If DynamoDB error: Rollback Cognito user, return error

**Default Values**:
- role: USER
- tier: FREE
- emailVerified: false
- UserSettings: All defaults from Shared Components

---

### loginWithSocial(input: SocialLoginInput): Result<AuthPayload>

**Purpose**: Register or login user with social provider

**Business Logic**:
1. Validate social token with provider API
2. Extract user info (email, name, picture) from token
3. Check if user exists in Cognito (by email)
4. If user exists:
   - Login with Cognito
   - Update lastLoginAt in DynamoDB
   - Generate tokens
5. If user doesn't exist:
   - Create Cognito user (federated identity)
   - Create DynamoDB user record (emailVerified=true)
   - Create default UserSettings
   - Generate tokens
6. Return AuthPayload with tokens

**Validation Rules**:
- Provider: Must be GOOGLE, FACEBOOK, or APPLE
- Token: Required, non-empty

**Error Handling**:
- If token invalid: Return `INVALID_SOCIAL_TOKEN` error
- If provider API error: Return `SOCIAL_PROVIDER_ERROR` error
- If DynamoDB error: Rollback Cognito user, return error

**Social Provider Integration**:
- Google: Validate with Google OAuth2 API
- Facebook: Validate with Facebook Graph API
- Apple: Validate with Apple Sign In (future)

---

### login(input: LoginInput): Result<AuthPayload>

**Purpose**: Login user with email and password

**Business Logic**:
1. Validate input (email, password)
2. Authenticate with Cognito
3. Check email verification status
4. Check account lock status
5. Update lastLoginAt in DynamoDB
6. Generate tokens (access + refresh)
7. Set session duration based on rememberMe flag
8. Return AuthPayload with tokens

**Validation Rules**:
- Email: Required, valid format
- Password: Required, non-empty
- RememberMe: Optional boolean

**Error Handling**:
- If credentials invalid: Return `INVALID_CREDENTIALS` error
- If email not verified: Return `EMAIL_NOT_VERIFIED` error
- If account locked: Return `ACCOUNT_LOCKED` error
- If user not found: Return `USER_NOT_FOUND` error

**Session Duration**:
- rememberMe=true: 30 days
- rememberMe=false: 1 day

**Rate Limiting**:
- Cognito built-in: 5 failed attempts = account lock
- Lock duration: 1 hour (Cognito default)

---

### logout(accessToken: string): Result<boolean>

**Purpose**: Logout user and invalidate tokens

**Business Logic**:
1. Validate access token
2. Revoke tokens in Cognito (global sign out)
3. Return true

**Validation Rules**:
- Access token: Required, valid JWT

**Error Handling**:
- If token invalid: Return `UNAUTHORIZED` error
- Always returns true on success (idempotent)

---

### requestPasswordReset(email: string): Result<boolean>

**Purpose**: Send password reset email

**Business Logic**:
1. Validate email format
2. Check if user exists in Cognito
3. If user exists: Send password reset email via Cognito
4. If user doesn't exist: Do nothing (security)
5. Always return true (don't reveal if email exists)

**Validation Rules**:
- Email: Required, valid format

**Rate Limiting**:
- Max 3 requests per email per hour
- Implemented at API Gateway level

**Reset Code**:
- Expires after 1 hour
- Single use only

---

### confirmPasswordReset(input: PasswordResetInput): Result<boolean>

**Purpose**: Reset password with verification code

**Business Logic**:
1. Validate input (email, code, new password)
2. Verify reset code with Cognito
3. Update password in Cognito
4. Invalidate all user sessions (global sign out)
5. Send confirmation email
6. Return true

**Validation Rules**:
- Email: Required, valid format
- Code: Required, 6-digit code
- New password: Must meet password policy

**Error Handling**:
- If code invalid/expired: Return `INVALID_RESET_CODE` error
- If password invalid: Return `INVALID_PASSWORD` error

**Security**:
- All existing sessions invalidated
- User must login again with new password

---

### refreshToken(refreshToken: string): Result<AuthPayload>

**Purpose**: Refresh access token

**Business Logic**:
1. Validate refresh token
2. Verify token with Cognito
3. Generate new access token
4. Generate new refresh token
5. Invalidate old refresh token
6. Return new tokens

**Validation Rules**:
- Refresh token: Required, valid JWT

**Error Handling**:
- If token invalid/expired: Return `INVALID_REFRESH_TOKEN` error
- If user not found: Return `USER_NOT_FOUND` error

**Token Rotation**:
- Old refresh token invalidated
- New refresh token issued
- Prevents token replay attacks

---

### getCurrentUser(accessToken: string): Result<User>

**Purpose**: Get current authenticated user

**Business Logic**:
1. Validate access token
2. Extract userId from token
3. Fetch user from DynamoDB Users table
4. Fetch user settings from DynamoDB UserSettings table
5. Return complete User object with settings

**Validation Rules**:
- Access token: Required, valid JWT

**Error Handling**:
- If token invalid: Return `UNAUTHORIZED` error
- If user not found: Return `USER_NOT_FOUND` error

---

### verifyEmail(code: string): Result<boolean>

**Purpose**: Verify email address

**Business Logic**:
1. Validate verification code
2. Confirm email with Cognito
3. Update emailVerified=true in DynamoDB
4. Return true

**Validation Rules**:
- Code: Required, non-empty

**Error Handling**:
- If code invalid/expired: Return `INVALID_VERIFICATION_CODE` error
- If already verified: Return `EMAIL_ALREADY_VERIFIED` error

**Code Expiration**:
- Verification code expires after 24 hours
- User can request new code

---

### updateProfile(userId: string, input: UpdateProfileInput): Result<User>

**Purpose**: Update user profile

**Business Logic**:
1. Validate input
2. Fetch user from DynamoDB
3. Update provided fields only
4. Save to DynamoDB
5. Return updated User object

**Validation Rules**:
- Name: Optional, 1-100 chars if provided
- ProfilePictureUrl: Optional, valid S3 URL if provided

**Error Handling**:
- If user not found: Return `USER_NOT_FOUND` error
- If validation fails: Return `VALIDATION_ERROR` error

**Updatable Fields**:
- name
- profilePictureUrl

**Non-Updatable Fields**:
- email (requires separate flow)
- role (admin only)
- tier (via subscription service)

---

## Validation Utilities

### validateEmail(email: string): boolean
- Check email format using regex
- Max length: 255 characters
- Must contain @ and domain

### validatePassword(password: string): boolean
- Min length: 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- No max length (Cognito handles)

### validateName(name: string): boolean
- Min length: 1 character
- Max length: 100 characters
- No special validation (allow unicode)

---

## Error Mapping

### Cognito Errors → Service Errors
- `UsernameExistsException` → `EMAIL_ALREADY_EXISTS`
- `InvalidPasswordException` → `INVALID_PASSWORD`
- `UserNotFoundException` → `USER_NOT_FOUND`
- `NotAuthorizedException` → `INVALID_CREDENTIALS`
- `UserNotConfirmedException` → `EMAIL_NOT_VERIFIED`
- `TooManyRequestsException` → `RATE_LIMIT_EXCEEDED`
- `CodeMismatchException` → `INVALID_VERIFICATION_CODE`
- `ExpiredCodeException` → `INVALID_VERIFICATION_CODE`

---

## Business Rules Summary

### Registration
- Email must be unique
- Password must meet policy
- Email verification required
- Default tier: FREE
- Default role: USER

### Login
- Email must be verified
- Max 5 failed attempts before lock
- Session duration based on rememberMe
- lastLoginAt updated on success

### Social Login
- Auto-verified (no email verification)
- Creates account if doesn't exist
- Links to existing account by email

### Password Reset
- Reset code expires in 1 hour
- All sessions invalidated on reset
- Confirmation email sent

### Profile Updates
- Only name and profile picture updatable
- Email change requires separate flow
- Role and tier changes restricted

---

## Integration Points

### AWS Cognito
- User registration
- User authentication
- Token generation and validation
- Password reset flows
- Email verification
- Session management

### DynamoDB
- Users table: User profile data
- UserSettings table: User preferences

### Shared Components
- User entity types
- UserSettings entity types
- Validation utilities
- Error types and Result pattern

---

## Summary

**Service Methods**: 10 core methods
**Validation**: Email, password, name validation
**Error Handling**: Cognito error mapping, Result pattern
**Security**: Email verification, rate limiting, account locking, token rotation
**Integration**: Cognito (auth), DynamoDB (data), Shared Components (types)

