/**
 * Unit tests for Authentication Utility
 */

import {
  validateToken,
  extractTokenFromHeader,
  authenticateRequest,
  AuthenticationError,
  AuthContext,
} from '../src/utils/auth.util';

describe('Auth Utility', () => {
  const mockUserPoolId = 'us-east-1_ABC123';
  const mockRegion = 'us-east-1';

  // Helper to create a mock JWT token
  function createMockToken(payload: any): string {
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = 'mock-signature';
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  describe('validateToken', () => {
    it('should validate a valid token and return auth context', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        'cognito:username': 'testuser',
        email: 'test@example.com',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now + 3600, // Expires in 1 hour
        iat: now,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      const result = await validateToken(token, mockUserPoolId, mockRegion);

      expect(result).toEqual({
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('should throw error if token is missing', async () => {
      await expect(validateToken('', mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(validateToken('', mockUserPoolId, mockRegion)).rejects.toThrow(
        'Token is required'
      );
    });

    it('should throw error if user pool ID is missing', async () => {
      const token = createMockToken({ sub: 'user-123' });
      await expect(validateToken(token, '', mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(validateToken(token, '', mockRegion)).rejects.toThrow(
        'User Pool ID is required'
      );
    });

    it('should throw error if token format is invalid', async () => {
      await expect(validateToken('invalid-token', mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(validateToken('invalid-token', mockUserPoolId, mockRegion)).rejects.toThrow(
        'Invalid token format'
      );
    });

    it('should throw error if token issuer is invalid', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        iss: 'https://invalid-issuer.com',
        exp: now + 3600,
        iat: now,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      await expect(validateToken(token, mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(validateToken(token, mockUserPoolId, mockRegion)).rejects.toThrow(
        'Invalid token issuer'
      );
    });

    it('should throw error if token is expired', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now - 3600, // Expired 1 hour ago
        iat: now - 7200,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      await expect(validateToken(token, mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(validateToken(token, mockUserPoolId, mockRegion)).rejects.toThrow(
        'Token has expired'
      );
    });

    it('should throw error if token use is invalid', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now + 3600,
        iat: now,
        token_use: 'invalid',
      };

      const token = createMockToken(payload);
      await expect(validateToken(token, mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(validateToken(token, mockUserPoolId, mockRegion)).rejects.toThrow(
        'Invalid token use'
      );
    });

    it('should accept id token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        'cognito:username': 'testuser',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now + 3600,
        iat: now,
        token_use: 'id',
      };

      const token = createMockToken(payload);
      const result = await validateToken(token, mockUserPoolId, mockRegion);

      expect(result.userId).toBe('user-123');
    });

    it('should handle token without optional fields', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now + 3600,
        iat: now,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      const result = await validateToken(token, mockUserPoolId, mockRegion);

      expect(result).toEqual({
        userId: 'user-123',
        username: undefined,
        email: undefined,
      });
    });

    it('should use default region if not provided', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-123',
        iss: `https://cognito-idp.us-east-1.amazonaws.com/${mockUserPoolId}`,
        exp: now + 3600,
        iat: now,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      const result = await validateToken(token, mockUserPoolId); // No region provided

      expect(result.userId).toBe('user-123');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'mock-jwt-token';
      const header = `Bearer ${token}`;
      const result = extractTokenFromHeader(header);

      expect(result).toBe(token);
    });

    it('should throw error if Authorization header is missing', () => {
      expect(() => extractTokenFromHeader(undefined)).toThrow(AuthenticationError);
      expect(() => extractTokenFromHeader(undefined)).toThrow(
        'Authorization header is missing'
      );
    });

    it('should throw error if Authorization header format is invalid', () => {
      expect(() => extractTokenFromHeader('InvalidFormat')).toThrow(AuthenticationError);
      expect(() => extractTokenFromHeader('InvalidFormat')).toThrow(
        'Invalid Authorization header format'
      );
    });

    it('should throw error if Authorization header does not start with Bearer', () => {
      expect(() => extractTokenFromHeader('Basic token123')).toThrow(AuthenticationError);
      expect(() => extractTokenFromHeader('Basic token123')).toThrow(
        'Invalid Authorization header format'
      );
    });

    it('should throw error if token is missing after Bearer', () => {
      expect(() => extractTokenFromHeader('Bearer')).toThrow(AuthenticationError);
    });
  });

  describe('authenticateRequest', () => {
    it('should authenticate request with valid Authorization header', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-456',
        'cognito:username': 'requestuser',
        email: 'request@example.com',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now + 3600,
        iat: now,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      const headers = {
        authorization: `Bearer ${token}`,
      };

      const result = await authenticateRequest(headers, mockUserPoolId, mockRegion);

      expect(result).toEqual({
        userId: 'user-456',
        username: 'requestuser',
        email: 'request@example.com',
      });
    });

    it('should handle case-insensitive Authorization header', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-789',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now + 3600,
        iat: now,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      const headers = {
        Authorization: `Bearer ${token}`, // Capital A
      };

      const result = await authenticateRequest(headers, mockUserPoolId, mockRegion);

      expect(result.userId).toBe('user-789');
    });

    it('should throw error if Authorization header is missing', async () => {
      const headers = {};

      await expect(authenticateRequest(headers, mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(authenticateRequest(headers, mockUserPoolId, mockRegion)).rejects.toThrow(
        'Authorization header is missing'
      );
    });

    it('should throw error if token is invalid', async () => {
      const headers = {
        authorization: 'Bearer invalid-token',
      };

      await expect(authenticateRequest(headers, mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
    });

    it('should throw error if token is expired', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'user-expired',
        iss: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}`,
        exp: now - 3600, // Expired
        iat: now - 7200,
        token_use: 'access',
      };

      const token = createMockToken(payload);
      const headers = {
        authorization: `Bearer ${token}`,
      };

      await expect(authenticateRequest(headers, mockUserPoolId, mockRegion)).rejects.toThrow(
        AuthenticationError
      );
      await expect(authenticateRequest(headers, mockUserPoolId, mockRegion)).rejects.toThrow(
        'Token has expired'
      );
    });
  });

  describe('AuthenticationError', () => {
    it('should create error with correct name', () => {
      const error = new AuthenticationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Test error');
    });
  });
});
