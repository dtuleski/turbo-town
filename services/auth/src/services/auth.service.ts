import { randomUUID } from 'crypto';
import { User, UserRole, SubscriptionTier } from '@memory-game/shared';
import {
  ICognitoClient,
  IUserRepository,
  IUserSettingsRepository,
  RegisterInput,
  LoginInput,
  LoginWithSocialInput,
  RequestPasswordResetInput,
  ConfirmPasswordResetInput,
  RefreshTokenInput,
  UpdateProfileInput,
  VerifyEmailInput,
  AuthResponse,
  TokenResponse,
} from '../types';
import { validateRegistrationInput, sanitizeEmail, sanitizeDisplayName } from '../utils/validation';
import { ValidationError } from '@memory-game/shared';
import { logger } from '../utils/logger';
import { metrics, MetricName } from '../utils/metrics';

export class AuthService {
  constructor(
    private cognitoClient: ICognitoClient,
    private userRepository: IUserRepository,
    private userSettingsRepository: IUserSettingsRepository,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const startTime = Date.now();

    try {
      logger.info('Starting user registration', { email: input.email });

      // Validate input
      const validation = validateRegistrationInput(input.email, input.password, input.displayName);
      if (!validation.valid) {
        throw new ValidationError(Object.values(validation.errors).join(', '));
      }

      // Sanitize input
      const email = sanitizeEmail(input.email);
      const displayName = sanitizeDisplayName(input.displayName);

      // Check if user already exists
      const existingUser = await this.userRepository.getByEmail(email);
      if (existingUser) {
        throw new ValidationError('An account with this email already exists');
      }

      // Create user in Cognito
      const { userId: cognitoId } = await this.cognitoClient.signUp(email, input.password, displayName);

      // Create user in DynamoDB
      const userId = randomUUID();
      const user = await this.userRepository.create({
        id: userId,
        email,
        name: displayName,
        role: UserRole.User,
        tier: SubscriptionTier.Free,
        cognitoId,
        emailVerified: false,
      });

      // Create default user settings
      await this.userSettingsRepository.create(userId);

      // Note: User needs to verify email before they can login
      // Return empty tokens since email verification is required
      logger.info('User registered successfully', { userId, email });
      await metrics.publishCount(MetricName.REGISTRATION_COUNT);
      await metrics.publishLatency(MetricName.LATENCY, Date.now() - startTime, { operation: 'register' });

      return {
        user,
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
      };
    } catch (error) {
      logger.error('Registration failed', error as Error, { email: input.email });
      await metrics.publishCount(MetricName.ERROR_COUNT, 1, { operation: 'register' });
      throw error;
    }
  }

  async verifyEmail(input: VerifyEmailInput): Promise<User> {
    try {
      logger.info('Verifying email', { email: input.email });

      const email = sanitizeEmail(input.email);

      // Confirm signup in Cognito
      await this.cognitoClient.confirmSignUp(email, input.code);

      // Update user in DynamoDB
      const user = await this.userRepository.getByEmail(email);
      if (!user) {
        throw new ValidationError('User not found');
      }

      const updatedUser = await this.userRepository.update(user.id, {
        emailVerified: true,
      });

      logger.info('Email verified successfully', { userId: user.id, email });

      return updatedUser;
    } catch (error) {
      logger.error('Email verification failed', error as Error, { email: input.email });
      throw error;
    }
  }

  async loginWithSocial(input: LoginWithSocialInput): Promise<AuthResponse> {
    const startTime = Date.now();

    try {
      logger.info('Starting social login', { provider: input.provider });

      // Authenticate with Cognito
      const tokens = await this.cognitoClient.adminInitiateAuth(input.provider, input.accessToken);

      // Get user info from token
      const { userId: cognitoId, email } = await this.cognitoClient.getUserFromToken(tokens.accessToken);

      // Check if user exists
      let user = await this.userRepository.getByCognitoId(cognitoId);

      if (!user) {
        // Create new user for social login
        const userId = randomUUID();
        user = await this.userRepository.create({
          id: userId,
          email,
          name: email.split('@')[0] || 'User', // Default name from email
          role: UserRole.User,
          tier: SubscriptionTier.Free,
          cognitoId,
          emailVerified: true, // Social logins are pre-verified
          lastLoginAt: new Date(),
        });

        // Create default user settings
        await this.userSettingsRepository.create(userId);

        logger.info('New user created via social login', { userId, email, provider: input.provider });
      } else {
        // Update last login
        user = await this.userRepository.update(user.id, {
          lastLoginAt: new Date(),
        });
      }

      logger.info('Social login successful', { userId: user.id, provider: input.provider });
      await metrics.publishCount(MetricName.LOGIN_COUNT, 1, { provider: input.provider });
      await metrics.publishLatency(MetricName.LATENCY, Date.now() - startTime, { operation: 'loginWithSocial' });

      return {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      logger.error('Social login failed', error as Error, { provider: input.provider });
      await metrics.publishCount(MetricName.ERROR_COUNT, 1, { operation: 'loginWithSocial' });
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const startTime = Date.now();

    try {
      logger.info('Starting login', { email: input.email });

      const email = sanitizeEmail(input.email);

      // Authenticate with Cognito
      const tokens = await this.cognitoClient.initiateAuth(email, input.password);

      // Get user from DynamoDB
      const user = await this.userRepository.getByEmail(email);
      if (!user) {
        throw new ValidationError('User not found');
      }

      // Update last login
      const updatedUser = await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      logger.info('Login successful', { userId: user.id, email });
      logger.logAuthEvent('login', true, { userId: user.id, email });
      await metrics.publishCount(MetricName.LOGIN_COUNT);
      await metrics.publishLatency(MetricName.LATENCY, Date.now() - startTime, { operation: 'login' });

      return {
        user: updatedUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      logger.error('Login failed', error as Error, { email: input.email });
      logger.logAuthEvent('login', false, { email: input.email });
      await metrics.publishCount(MetricName.FAILED_LOGIN_COUNT);
      await metrics.publishCount(MetricName.ERROR_COUNT, 1, { operation: 'login' });
      throw error;
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      logger.info('Starting logout');

      // Global sign out from Cognito
      await this.cognitoClient.globalSignOut(accessToken);

      logger.info('Logout successful');
      logger.logAuthEvent('logout', true);
    } catch (error) {
      logger.error('Logout failed', error as Error);
      throw error;
    }
  }

  async requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
    try {
      logger.info('Requesting password reset', { email: input.email });

      const email = sanitizeEmail(input.email);

      // Trigger forgot password in Cognito
      await this.cognitoClient.forgotPassword(email);

      logger.info('Password reset requested', { email });
      await metrics.publishCount(MetricName.PASSWORD_RESET_COUNT);
    } catch (error) {
      logger.error('Password reset request failed', error as Error, { email: input.email });
      throw error;
    }
  }

  async confirmPasswordReset(input: ConfirmPasswordResetInput): Promise<void> {
    try {
      logger.info('Confirming password reset', { email: input.email });

      const email = sanitizeEmail(input.email);

      // Confirm forgot password in Cognito
      await this.cognitoClient.confirmForgotPassword(email, input.code, input.newPassword);

      logger.info('Password reset confirmed', { email });
      logger.logSecurityEvent('password_reset', { email });
    } catch (error) {
      logger.error('Password reset confirmation failed', error as Error, { email: input.email });
      throw error;
    }
  }

  async refreshToken(input: RefreshTokenInput): Promise<TokenResponse> {
    try {
      logger.info('Refreshing token');

      // Refresh token in Cognito
      const tokens = await this.cognitoClient.refreshToken(input.refreshToken);

      logger.info('Token refreshed successfully');

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      logger.error('Token refresh failed', error as Error);
      throw error;
    }
  }

  async getCurrentUser(accessToken: string): Promise<User> {
    try {
      logger.debug('Getting current user');

      // Get user info from token
      const { userId: cognitoId } = await this.cognitoClient.getUserFromToken(accessToken);

      // Get user from DynamoDB
      const user = await this.userRepository.getByCognitoId(cognitoId);
      if (!user) {
        throw new ValidationError('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Failed to get current user', error as Error);
      throw error;
    }
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    try {
      logger.info('Updating user profile', { userId });

      const updates: Partial<User> = {};

      if (input.displayName) {
        updates.name = sanitizeDisplayName(input.displayName);
      }

      if (input.avatarUrl) {
        updates.profilePictureUrl = input.avatarUrl;
      }

      const updatedUser = await this.userRepository.update(userId, updates);

      logger.info('Profile updated successfully', { userId });

      return updatedUser;
    } catch (error) {
      logger.error('Profile update failed', error as Error, { userId });
      throw error;
    }
  }
}
