"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const error_mapper_1 = require("../utils/error-mapper");
const dynamoDBClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDBClient);
const TABLE_NAME = process.env.ACHIEVEMENTS_TABLE_NAME;
class AchievementRepository {
    /**
     * Create achievement record
     */
    async create(achievement) {
        const now = new Date();
        const newAchievement = {
            ...achievement,
            createdAt: now,
            updatedAt: now,
        };
        try {
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: TABLE_NAME,
                Item: newAchievement,
            }));
            return newAchievement;
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Get all achievements for user
     */
    async getByUser(userId) {
        try {
            const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
            }));
            return (result.Items || []);
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Get specific achievement for user
     */
    async getByUserAndType(userId, type) {
        try {
            const result = await docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    userId,
                    type,
                },
            }));
            return result.Item ? result.Item : null;
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Update achievement progress
     */
    async update(userId, type, updates) {
        const now = new Date();
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        Object.entries(updates).forEach(([key, value]) => {
            updateExpression.push(`#${key} = :${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}`] = value;
        });
        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = now;
        try {
            const result = await docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    userId,
                    type,
                },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            }));
            return result.Attributes;
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Mark achievement as unlocked
     */
    async unlock(userId, type) {
        const now = new Date();
        try {
            const result = await docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    userId,
                    type,
                },
                UpdateExpression: 'SET #unlocked = :unlocked, #completedAt = :completedAt, #updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#unlocked': 'unlocked',
                    '#completedAt': 'completedAt',
                    '#updatedAt': 'updatedAt',
                },
                ExpressionAttributeValues: {
                    ':unlocked': true,
                    ':completedAt': now,
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
}
exports.AchievementRepository = AchievementRepository;
//# sourceMappingURL=achievement.repository.js.map