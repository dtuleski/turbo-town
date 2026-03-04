import { User, UserSettings, UserRole, SubscriptionTier, UITheme } from '@memory-game/shared';
import { randomUUID } from 'crypto';

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    tier: SubscriptionTier.FREE,
    cognitoId: randomUUID(),
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockUserSettings(userId: string, overrides?: Partial<UserSettings>): UserSettings {
  return {
    userId,
    soundEffectsEnabled: true,
    musicEnabled: true,
    soundVolume: 0.7,
    musicVolume: 0.5,
    notificationsEnabled: true,
    language: 'en',
    theme: UITheme.LIGHT,
    autoProgressDifficulty: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockCognitoTokens() {
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    idToken: 'mock-id-token',
    expiresIn: 3600,
  };
}

export function createMockJWT(userId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email,
      email_verified: true,
      'cognito:username': userId,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      token_use: 'access',
    }),
  ).toString('base64');
  const signature = 'mock-signature';

  return `${header}.${payload}.${signature}`;
}
