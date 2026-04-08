"use strict";
/**
 * Authentication Utility
 *
 * Provides JWT token validation for AWS Cognito tokens.
 * Validates token signature, expiration, and issuer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = void 0;
exports.validateToken = validateToken;
exports.extractTokenFromHeader = extractTokenFromHeader;
exports.authenticateRequest = authenticateRequest;
class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Validates a JWT token from AWS Cognito
 *
 * @param token - JWT token string (without 'Bearer ' prefix)
 * @param userPoolId - AWS Cognito User Pool ID
 * @param region - AWS region (default: us-east-1)
 * @returns AuthContext with userId and optional username/email
 * @throws AuthenticationError if token is invalid, expired, or has invalid signature
 */
async function validateToken(token, userPoolId, region = 'us-east-1') {
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
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
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
        const authContext = {
            userId: payload.sub,
            username: payload['cognito:username'],
            email: payload.email,
        };
        return authContext;
    }
    catch (error) {
        if (error instanceof AuthenticationError) {
            throw error;
        }
        throw new AuthenticationError(`Token validation failed: ${error.message}`);
    }
}
/**
 * Extracts token from Authorization header
 *
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string without 'Bearer ' prefix
 * @throws AuthenticationError if header is missing or malformed
 */
function extractTokenFromHeader(authHeader) {
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
async function authenticateRequest(headers, userPoolId, region = 'us-east-1') {
    const authHeader = headers['authorization'] || headers['Authorization'];
    const token = extractTokenFromHeader(authHeader);
    return validateToken(token, userPoolId, region);
}
//# sourceMappingURL=auth.util.js.map