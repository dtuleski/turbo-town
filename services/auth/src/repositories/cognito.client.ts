import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  AdminInitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  AdminGetUserCommand,
  GetUserCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { ICognitoClient, CognitoTokens, CognitoUser } from '../types';
import { mapCognitoError } from '../utils/error-mapper';
import { logger } from '../utils/logger';
import { metrics, MetricName } from '../utils/metrics';

export class CognitoClient implements ICognitoClient {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  constructor() {
    this.client = new CognitoIdentityProviderClient({});
    this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
    this.clientId = process.env.COGNITO_CLIENT_ID || '';

    if (!this.userPoolId || !this.clientId) {
      throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set');
    }
  }

  async signUp(email: string, password: string, displayName: string): Promise<{ userId: string }> {
    try {
      logger.debug('Cognito signUp', { email });

      const result = await metrics.measureTime(
        async () => {
          const command = new SignUpCommand({
            ClientId: this.clientId,
            Username: email,
            Password: password,
            UserAttributes: [
              { Name: 'email', Value: email },
              { Name: 'name', Value: displayName },
            ],
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'signUp' },
      );

      logger.info('User signed up successfully', { email, userId: result.UserSub });

      return { userId: result.UserSub || '' };
    } catch (error) {
      logger.error('Cognito signUp failed', error as Error, { email });
      throw mapCognitoError(error as Error);
    }
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      logger.debug('Cognito confirmSignUp', { email });

      await metrics.measureTime(
        async () => {
          const command = new ConfirmSignUpCommand({
            ClientId: this.clientId,
            Username: email,
            ConfirmationCode: code,
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'confirmSignUp' },
      );

      logger.info('Email verified successfully', { email });
    } catch (error) {
      logger.error('Cognito confirmSignUp failed', error as Error, { email });
      throw mapCognitoError(error as Error);
    }
  }

  async initiateAuth(email: string, password: string): Promise<CognitoTokens> {
    try {
      logger.debug('Cognito initiateAuth', { email });

      const result = await metrics.measureTime(
        async () => {
          const command = new InitiateAuthCommand({
            ClientId: this.clientId,
            AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            AuthParameters: {
              USERNAME: email,
              PASSWORD: password,
            },
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'initiateAuth' },
      );

      if (!result.AuthenticationResult) {
        throw new Error('Authentication failed - no tokens returned');
      }

      logger.info('User authenticated successfully', { email });

      return {
        accessToken: result.AuthenticationResult.AccessToken || '',
        refreshToken: result.AuthenticationResult.RefreshToken || '',
        idToken: result.AuthenticationResult.IdToken || '',
        expiresIn: result.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error) {
      logger.error('Cognito initiateAuth failed', error as Error, { email });
      throw mapCognitoError(error as Error);
    }
  }

  async adminInitiateAuth(provider: string, accessToken: string): Promise<CognitoTokens> {
    try {
      logger.debug('Cognito adminInitiateAuth', { provider });

      const result = await metrics.measureTime(
        async () => {
          const command = new AdminInitiateAuthCommand({
            UserPoolId: this.userPoolId,
            ClientId: this.clientId,
            AuthFlow: AuthFlowType.CUSTOM_AUTH,
            AuthParameters: {
              PROVIDER: provider,
              ACCESS_TOKEN: accessToken,
            },
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'adminInitiateAuth', provider },
      );

      if (!result.AuthenticationResult) {
        throw new Error('Social authentication failed - no tokens returned');
      }

      logger.info('Social authentication successful', { provider });

      return {
        accessToken: result.AuthenticationResult.AccessToken || '',
        refreshToken: result.AuthenticationResult.RefreshToken || '',
        idToken: result.AuthenticationResult.IdToken || '',
        expiresIn: result.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error) {
      logger.error('Cognito adminInitiateAuth failed', error as Error, { provider });
      throw mapCognitoError(error as Error);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      logger.debug('Cognito forgotPassword', { email });

      await metrics.measureTime(
        async () => {
          const command = new ForgotPasswordCommand({
            ClientId: this.clientId,
            Username: email,
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'forgotPassword' },
      );

      logger.info('Password reset requested', { email });
    } catch (error) {
      logger.error('Cognito forgotPassword failed', error as Error, { email });
      throw mapCognitoError(error as Error);
    }
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      logger.debug('Cognito confirmForgotPassword', { email });

      await metrics.measureTime(
        async () => {
          const command = new ConfirmForgotPasswordCommand({
            ClientId: this.clientId,
            Username: email,
            ConfirmationCode: code,
            Password: newPassword,
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'confirmForgotPassword' },
      );

      logger.info('Password reset confirmed', { email });
    } catch (error) {
      logger.error('Cognito confirmForgotPassword failed', error as Error, { email });
      throw mapCognitoError(error as Error);
    }
  }

  async refreshToken(refreshToken: string): Promise<CognitoTokens> {
    try {
      logger.debug('Cognito refreshToken');

      const result = await metrics.measureTime(
        async () => {
          const command = new InitiateAuthCommand({
            ClientId: this.clientId,
            AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
            AuthParameters: {
              REFRESH_TOKEN: refreshToken,
            },
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'refreshToken' },
      );

      if (!result.AuthenticationResult) {
        throw new Error('Token refresh failed - no tokens returned');
      }

      logger.info('Token refreshed successfully');

      return {
        accessToken: result.AuthenticationResult.AccessToken || '',
        refreshToken: refreshToken, // Refresh token doesn't change
        idToken: result.AuthenticationResult.IdToken || '',
        expiresIn: result.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error) {
      logger.error('Cognito refreshToken failed', error as Error);
      throw mapCognitoError(error as Error);
    }
  }

  async globalSignOut(accessToken: string): Promise<void> {
    try {
      logger.debug('Cognito globalSignOut');

      await metrics.measureTime(
        async () => {
          const command = new GlobalSignOutCommand({
            AccessToken: accessToken,
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'globalSignOut' },
      );

      logger.info('User signed out successfully');
    } catch (error) {
      logger.error('Cognito globalSignOut failed', error as Error);
      throw mapCognitoError(error as Error);
    }
  }

  async adminGetUser(userId: string): Promise<CognitoUser> {
    try {
      logger.debug('Cognito adminGetUser', { userId });

      const result = await metrics.measureTime(
        async () => {
          const command = new AdminGetUserCommand({
            UserPoolId: this.userPoolId,
            Username: userId,
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'adminGetUser' },
      );

      const attributes: Record<string, string> = {};
      result.UserAttributes?.forEach((attr) => {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      });

      return {
        username: result.Username || '',
        userAttributes: attributes,
        userStatus: result.UserStatus || '',
      };
    } catch (error) {
      logger.error('Cognito adminGetUser failed', error as Error, { userId });
      throw mapCognitoError(error as Error);
    }
  }

  async getUserFromToken(accessToken: string): Promise<{ userId: string; email: string }> {
    try {
      logger.debug('Cognito getUserFromToken');

      const result = await metrics.measureTime(
        async () => {
          const command = new GetUserCommand({
            AccessToken: accessToken,
          });
          return await this.client.send(command);
        },
        MetricName.COGNITO_OPERATION_TIME,
        { operation: 'getUserFromToken' },
      );

      const email = result.UserAttributes?.find((attr) => attr.Name === 'email')?.Value || '';

      return {
        userId: result.Username || '',
        email,
      };
    } catch (error) {
      logger.error('Cognito getUserFromToken failed', error as Error);
      throw mapCognitoError(error as Error);
    }
  }
}
