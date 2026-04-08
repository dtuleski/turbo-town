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
    sub: string;
    'cognito:username'?: string;
    email?: string;
    iss: string;
    exp: number;
    iat: number;
    token_use: string;
}
export declare class AuthenticationError extends Error {
    constructor(message: string);
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
export declare function validateToken(token: string, userPoolId: string, region?: string): Promise<AuthContext>;
/**
 * Extracts token from Authorization header
 *
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string without 'Bearer ' prefix
 * @throws AuthenticationError if header is missing or malformed
 */
export declare function extractTokenFromHeader(authHeader?: string): string;
/**
 * Validates authentication from request headers
 *
 * @param headers - Request headers object
 * @param userPoolId - AWS Cognito User Pool ID
 * @param region - AWS region (default: us-east-1)
 * @returns AuthContext with userId and optional username/email
 * @throws AuthenticationError if authentication fails
 */
export declare function authenticateRequest(headers: Record<string, string | undefined>, userPoolId: string, region?: string): Promise<AuthContext>;
//# sourceMappingURL=auth.util.d.ts.map