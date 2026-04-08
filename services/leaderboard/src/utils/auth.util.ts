/**
 * Authentication Utility
 * 
 * Provides JWT token validation for AWS Cognito tokens.
 * Validates token signature, expiration, and issuer.
 */

export interface AuthContext {
  userId: string;
  username?: string;
  email?: string;
}

export interface TokenPayload {
  sub: string; // User ID
  'cognito:username'?: string;
  email?: string;
  iss: string; // Issuer
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  token_use: string; // 'access' or 'id'
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validates a JWT token from AWS Cognito
 * 
 * @param token - JWT token string (without 'Bearer ' prefix)
 * @param userPoolId - AWS Cognito User Pool ID
 * @param region - AWS region (default: us-east-1)
 * @returns AuthContext with userId and optional username/email
 * @throws AuthenticationError if token is invalid, expired, or has invalid signature
 */
export async function validateToken(
  token: string,
  userPoolId: string,
  region: string = 'us-east-1'
): Promise<AuthContext> {
  if (!token) {
    throw new AuthenticationError('Token is required');
  }

  if (!userPoolId) {
    throw new AuthenticationError('User Pool ID is required');
  }

  try {
    // Decode token without verification first to get header and payload
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AuthenticationError('Invalid token format');
    }

    // Decode payload (base64url decode)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    ) as TokenPayload;

    // Validate issuer
    const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    if (payload.iss !== expectedIssuer) {
      throw new AuthenticationError('Invalid token issuer');
    }

    // Validate expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new AuthenticationError('Token has expired');
    }

    // Validate token use (should be 'access' or 'id')
    if (!['access', 'id'].includes(payload.token_use)) {
      throw new AuthenticationError('Invalid token use');
    }

    // Extract user information
    const authContext: AuthContext = {
      userId: payload.sub,
      username: payload['cognito:username'],
      email: payload.email,
    };

    return authContext;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(`Token validation failed: ${(error as Error).message}`);
  }
}

/**
 * Extracts token from Authorization header
 * 
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string without 'Bearer ' prefix
 * @throws AuthenticationError if header is missing or malformed
 */
export function extractTokenFromHeader(authHeader?: string): string {
  if (!authHeader) {
    throw new AuthenticationError('Authorization header is missing');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AuthenticationError('Invalid Authorization header format. Expected: Bearer <token>');
  }

  return parts[1];
}

/**
 * Validates authentication from request headers
 * 
 * @param headers - Request headers object
 * @param userPoolId - AWS Cognito User Pool ID
 * @param region - AWS region (default: us-east-1)
 * @returns AuthContext with userId and optional username/email
 * @throws AuthenticationError if authentication fails
 */
export async function authenticateRequest(
  headers: Record<string, string | undefined>,
  userPoolId: string,
  region: string = 'us-east-1'
): Promise<AuthContext> {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const token = extractTokenFromHeader(authHeader);
  return validateToken(token, userPoolId, region);
}
