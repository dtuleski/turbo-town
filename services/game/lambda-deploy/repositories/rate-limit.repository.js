"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const error_mapper_1 = require("../utils/error-mapper");
const dynamoDBClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDBClient);
const TABLE_NAME = process.env.RATE_LIMITS_TABLE_NAME;
class RateLimitRepository {
    /**
     * Get rate limit for user
     */
    async get(userId) {
        try {
            const result = await docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: TABLE_NAME,
                Key: { userId },
            }));
            return result.Item ? result.Item : null;
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Create or update rate limit
     */
    async upsert(rateLimit) {
        const now = new Date();
        const nowISO = now.toISOString();
        const dbItem = {
            userId: rateLimit.userId,
            tier: rateLimit.tier,
            count: rateLimit.count,
            resetAt: rateLimit.resetAt instanceof Date ? rateLimit.resetAt.toISOString() : rateLimit.resetAt,
            updatedAt: nowISO,
            expiresAt: Math.floor((rateLimit.resetAt instanceof Date ? rateLimit.resetAt : new Date(rateLimit.resetAt)).getTime() / 1000),
        };
        try {
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: TABLE_NAME,
                Item: dbItem,
            }));
            return {
                userId: rateLimit.userId,
                tier: rateLimit.tier,
                count: rateLimit.count,
                resetAt: rateLimit.resetAt instanceof Date ? rateLimit.resetAt : new Date(rateLimit.resetAt),
                expiresAt: Math.floor((rateLimit.resetAt instanceof Date ? rateLimit.resetAt : new Date(rateLimit.resetAt)).getTime() / 1000),
                updatedAt: now,
            };
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Increment usage count
     */
    async increment(userId) {
        const now = new Date().toISOString();
        try {
            const result = await docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: TABLE_NAME,
                Key: { userId },
                UpdateExpression: 'SET #count = #count + :inc, #updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#count': 'count',
                    '#updatedAt': 'updatedAt',
                },
                ExpressionAttributeValues: {
                    ':inc': 1,
                    ':updatedAt': now,
                },
                ReturnValues: 'ALL_NEW',
            }));
            return result.Attributes;
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Reset rate limit (called at midnight UTC)
     */
    async reset(userId, tier) {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        // TTL: 48 hours from now (for cleanup)
        const expiresAt = Math.floor(Date.now() / 1000) + 48 * 60 * 60;
        const rateLimit = {
            userId,
            tier,
            count: 0,
            resetAt: tomorrow.toISOString(),
            expiresAt,
            updatedAt: now.toISOString(),
        };
        return this.upsert(rateLimit);
    }
}
exports.RateLimitRepository = RateLimitRepository;
//# sourceMappingURL=rate-limit.repository.js.map