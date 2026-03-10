"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@memory-game/shared");
const error_mapper_1 = require("../utils/error-mapper");
const dynamoDBClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDBClient);
const TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE_NAME;
/**
 * Subscription Repository (Read-Only)
 * Subscriptions are owned by Payment Service
 */
class SubscriptionRepository {
    /**
     * Get subscription by user ID
     * No caching - need real-time tier validation
     */
    async getByUserId(userId) {
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
     * Get subscription tier for user
     * Returns FREE if no subscription found
     */
    async getTier(userId) {
        const subscription = await this.getByUserId(userId);
        if (!subscription || subscription.status !== 'ACTIVE') {
            return shared_1.SubscriptionTier.Free;
        }
        return subscription.tier;
    }
    /**
     * Update subscription (for Stripe integration)
     */
    async updateSubscription(data) {
        try {
            const now = new Date();
            // Get existing subscription
            const existing = await this.getByUserId(data.userId);
            const subscription = {
                userId: data.userId,
                tier: data.tier || existing?.tier || shared_1.SubscriptionTier.Free,
                status: data.status || existing?.status || 'ACTIVE',
                stripeCustomerId: data.stripeCustomerId || existing?.stripeCustomerId,
                stripeSubscriptionId: data.stripeSubscriptionId || existing?.stripeSubscriptionId,
                currentPeriodStart: data.currentPeriodStart || existing?.currentPeriodStart,
                currentPeriodEnd: data.currentPeriodEnd || existing?.currentPeriodEnd,
                startDate: existing?.startDate || now,
                createdAt: existing?.createdAt || now,
                updatedAt: now,
            };
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: TABLE_NAME,
                Item: subscription,
            }));
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
}
exports.SubscriptionRepository = SubscriptionRepository;
//# sourceMappingURL=subscription.repository.js.map