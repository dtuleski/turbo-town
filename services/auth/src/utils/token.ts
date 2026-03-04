import { AuthenticationError } from '@memory-game/shared';

interface JWTPayload {
  sub: string; // User ID (Cognito username)
  email: string;
  email_verified: boolean;
  'cognito:username': string;
  'cognito:groups'?: string[];
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  token_use: 'access' | 'id';
}

/**
 * Parse JWT token without verification (Cognito tokens are verified by API Gateway)
 * This is for extracting user information from already-verified tokens
 */
export function parseJWT(token: string): JWTPayload {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AuthenticationError('Invalid token format');
    }

    const payload = parts[1];
    if (!payload) {
      throw new AuthenticationError('Invalid token format');
    }

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Failed to parse token');
  }
}

/**
 * Extract user ID from JWT token
 */
export function getUserIdFromToken(token: string): string {
  const payload = parseJWT(token);
  return payload.sub || payload['cognito:username'];
}

/**
 * Extract email from JWT token
 */
export function getEmailFromToken(token: string): string {
  const payload = parseJWT(token);
  if (!payload.email) {
    throw new AuthenticationError('Email not found in token');
  }
  return payload.email;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJWT(token);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiration(token: string): number {
  const payload = parseJWT(token);
  return payload.exp;
}

/**
 * Get time until token expires (in seconds)
 */
export function getTimeUntilExpiration(token: string): number {
  const payload = parseJWT(token);
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

/**
 * Validate token format and expiration
 */
export function validateToken(token: string): { valid: boolean; error?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is required' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    if (isTokenExpired(token)) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}

/**
 * Extract authorization token from header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}
