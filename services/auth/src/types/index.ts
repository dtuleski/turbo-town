import { User, UserSettings, SubscriptionTier, UserRole } from '@memory-game/shared';

// Input Types
export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginWithSocialInput {
  provider: 'GOOGLE' | 'FACEBOOK';
  accessToken: string;
}

export interface RequestPasswordResetInput {
  email: string;
}

export interface ConfirmPasswordResetInput {
  email: string;
  code: string;
  newPassword: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

// Response Types
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Cognito Types
export interface CognitoUser {
  username: string;
  userAttributes: Record<string, string>;
  userStatus: string;
}

export interface CognitoTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

// Repository Interfaces
export interface ICognitoClient {
  signUp(email: string, password: string, displayName: string): Promise<{ userId: string }>;
  confirmSignUp(email: string, code: string): Promise<void>;
  initiateAuth(email: string, password: string): Promise<CognitoTokens>;
  adminInitiateAuth(provider: string, accessToken: string): Promise<CognitoTokens>;
  forgotPassword(email: string): Promise<void>;
  confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<CognitoTokens>;
  globalSignOut(accessToken: string): Promise<void>;
  adminGetUser(userId: string): Promise<CognitoUser>;
  getUserFromToken(accessToken: string): Promise<{ userId: string; email: string }>;
}

export interface IUserRepository {
  create(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User>;
  getById(userId: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByCognitoId(cognitoId: string): Promise<User | null>;
  update(userId: string, updates: Partial<User>): Promise<User>;
  updateTier(userId: string, tier: SubscriptionTier): Promise<User>;
  delete(userId: string): Promise<void>;
}

export interface IUserSettingsRepository {
  create(userId: string): Promise<UserSettings>;
  getByUserId(userId: string): Promise<UserSettings | null>;
  update(userId: string, updates: Partial<UserSettings>): Promise<UserSettings>;
}

// Service Context
export interface AuthContext {
  userId?: string;
  email?: string;
  role?: UserRole;
  tier?: SubscriptionTier;
}
