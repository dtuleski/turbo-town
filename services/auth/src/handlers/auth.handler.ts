import { AuthService } from '../services/auth.service';
import { CognitoClient } from '../repositories/cognito.client';
import { UserRepository } from '../repositories/user.repository';
import { UserSettingsRepository } from '../repositories/user-settings.repository';
import {
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
  AuthContext,
} from '../types';
import { User } from '@memory-game/shared';
import { extractTokenFromHeader, getUserIdFromToken } from '../utils/token';
import { logger } from '../utils/logger';
import { getUserFriendlyMessage } from '../utils/error-mapper';

// Initialize repositories and service
const cognitoClient = new CognitoClient();
const userRepository = new UserRepository();
const userSettingsRepository = new UserSettingsRepository();
const authService = new AuthService(cognitoClient, userRepository, userSettingsRepository);

// GraphQL Context
interface GraphQLContext {
  headers?: Record<string, string>;
  authContext?: AuthContext;
}

// Extract auth context from headers
function getAuthContext(context: GraphQLContext): AuthContext {
  const authHeader = context.headers?.['authorization'] || context.headers?.['Authorization'];
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return {};
  }

  try {
    const userId = getUserIdFromToken(token);
    return { userId };
  } catch {
    return {};
  }
}

// Require authentication
function requireAuth(context: GraphQLContext): string {
  const authContext = getAuthContext(context);
  if (!authContext.userId) {
    throw new Error('Authentication required');
  }
  return authContext.userId;
}

// GraphQL Resolvers
export const resolvers = {
  Query: {
    getCurrentUser: async (_parent: unknown, _args: unknown, context: GraphQLContext): Promise<User> => {
      try {
        logger.setContext({ operation: 'getCurrentUser' });

        const authHeader = context.headers?.['authorization'] || context.headers?.['Authorization'];
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
          throw new Error('Authentication required');
        }

        const user = await authService.getCurrentUser(token);

        logger.clearContext();
        return user;
      } catch (error) {
        logger.error('getCurrentUser failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    verifyEmail: async (_parent: unknown, args: { input: VerifyEmailInput }): Promise<User> => {
      try {
        logger.setContext({ operation: 'verifyEmail', email: args.input.email });

        const user = await authService.verifyEmail(args.input);

        logger.clearContext();
        return user;
      } catch (error) {
        logger.error('verifyEmail failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },
  },

  Mutation: {
    register: async (_parent: unknown, args: { input: RegisterInput }): Promise<AuthResponse> => {
      try {
        logger.setContext({ operation: 'register', email: args.input.email });

        const response = await authService.register(args.input);

        logger.clearContext();
        return response;
      } catch (error) {
        logger.error('register failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    loginWithSocial: async (_parent: unknown, args: { input: LoginWithSocialInput }): Promise<AuthResponse> => {
      try {
        logger.setContext({ operation: 'loginWithSocial', provider: args.input.provider });

        const response = await authService.loginWithSocial(args.input);

        logger.clearContext();
        return response;
      } catch (error) {
        logger.error('loginWithSocial failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    login: async (_parent: unknown, args: { input: LoginInput }): Promise<AuthResponse> => {
      try {
        logger.setContext({ operation: 'login', email: args.input.email });

        const response = await authService.login(args.input);

        logger.clearContext();
        return response;
      } catch (error) {
        logger.error('login failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    logout: async (_parent: unknown, _args: unknown, context: GraphQLContext): Promise<boolean> => {
      try {
        logger.setContext({ operation: 'logout' });

        const authHeader = context.headers?.['authorization'] || context.headers?.['Authorization'];
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
          throw new Error('Authentication required');
        }

        await authService.logout(token);

        logger.clearContext();
        return true;
      } catch (error) {
        logger.error('logout failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    requestPasswordReset: async (_parent: unknown, args: { input: RequestPasswordResetInput }): Promise<boolean> => {
      try {
        logger.setContext({ operation: 'requestPasswordReset', email: args.input.email });

        await authService.requestPasswordReset(args.input);

        logger.clearContext();
        return true;
      } catch (error) {
        logger.error('requestPasswordReset failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    confirmPasswordReset: async (_parent: unknown, args: { input: ConfirmPasswordResetInput }): Promise<boolean> => {
      try {
        logger.setContext({ operation: 'confirmPasswordReset', email: args.input.email });

        await authService.confirmPasswordReset(args.input);

        logger.clearContext();
        return true;
      } catch (error) {
        logger.error('confirmPasswordReset failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    refreshToken: async (_parent: unknown, args: { input: RefreshTokenInput }): Promise<TokenResponse> => {
      try {
        logger.setContext({ operation: 'refreshToken' });

        const response = await authService.refreshToken(args.input);

        logger.clearContext();
        return response;
      } catch (error) {
        logger.error('refreshToken failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },

    updateProfile: async (_parent: unknown, args: { input: UpdateProfileInput }, context: GraphQLContext): Promise<User> => {
      try {
        const userId = requireAuth(context);
        logger.setContext({ operation: 'updateProfile', userId });

        const user = await authService.updateProfile(userId, args.input);

        logger.clearContext();
        return user;
      } catch (error) {
        logger.error('updateProfile failed', error as Error);
        logger.clearContext();
        throw new Error(getUserFriendlyMessage(error as Error));
      }
    },
  },
};
