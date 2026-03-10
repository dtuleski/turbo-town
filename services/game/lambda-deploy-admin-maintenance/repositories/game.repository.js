"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const error_mapper_1 = require("../utils/error-mapper");
const uuid_1 = require("uuid");
// Initialize DynamoDB client (singleton for Lambda container reuse)
const dynamoDBClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDBClient);
const TABLE_NAME = process.env.GAMES_TABLE_NAME;
class GameRepository {
    /**
     * Create a new game
     */
    async create(game) {
        const now = new Date();
        const nowISO = now.toISOString();
        const gameId = (0, uuid_1.v4)();
        // Store as ISO strings in DynamoDB
        const dbItem = {
            userId: game.userId,
            gameId: gameId,
            themeId: game.themeId,
            difficulty: game.difficulty,
            status: game.status,
            startedAt: game.startedAt instanceof Date ? game.startedAt.toISOString() : game.startedAt,
            completedAt: game.completedAt instanceof Date ? game.completedAt.toISOString() : game.completedAt,
            completionTime: game.completionTime,
            attempts: game.attempts,
            score: game.score,
            createdAt: nowISO,
            updatedAt: nowISO,
        };
        try {
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: TABLE_NAME,
                Item: dbItem,
            }));
            // Return as Game with Date objects
            return {
                id: gameId,
                userId: game.userId,
                themeId: game.themeId,
                difficulty: game.difficulty,
                status: game.status,
                startedAt: game.startedAt instanceof Date ? game.startedAt : new Date(game.startedAt),
                completedAt: game.completedAt ? (game.completedAt instanceof Date ? game.completedAt : new Date(game.completedAt)) : undefined,
                completionTime: game.completionTime,
                attempts: game.attempts,
                score: game.score,
                createdAt: now,
                updatedAt: now,
            };
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Get game by ID
     */
    async getById(gameId, userId) {
        // If userId not provided, we need to query by gameId using GSI
        // For now, require userId for direct get
        if (!userId) {
            throw new Error('userId required for getById');
        }
        try {
            const result = await docClient.send(new lib_dynamodb_1.GetCommand({
                TableName: TABLE_NAME,
                Key: { userId: userId, gameId: gameId },
            }));
            return result.Item ? result.Item : null;
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Update game
     */
    async update(gameId, updates, userId) {
        if (!userId && updates.userId) {
            userId = updates.userId;
        }
        if (!userId) {
            throw new Error('userId required for update');
        }
        const now = new Date().toISOString();
        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        // Build update expression - convert Date objects to ISO strings
        Object.entries(updates).forEach(([key, value]) => {
            if (key !== 'userId' && key !== 'gameId' && key !== 'id') { // Skip key attributes
                updateExpression.push(`#${key} = :${key}`);
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}`] = value instanceof Date ? value.toISOString() : value;
            }
        });
        // Always update updatedAt
        updateExpression.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = now;
        try {
            const result = await docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: TABLE_NAME,
                Key: { userId: userId, gameId: gameId },
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
     * Query games by user ID
     */
    async queryByUser(userId, options = {}) {
        const { limit = 20, lastEvaluatedKey, sortOrder = 'desc', filters = {} } = options;
        try {
            let filterExpression;
            const expressionAttributeNames = {};
            const expressionAttributeValues = { ':userId': userId };
            // Build filter expression
            const filterConditions = [];
            if (filters.themeId) {
                filterConditions.push('#themeId = :themeId');
                expressionAttributeNames['#themeId'] = 'themeId';
                expressionAttributeValues[':themeId'] = filters.themeId;
            }
            if (filters.difficulty) {
                filterConditions.push('#difficulty = :difficulty');
                expressionAttributeNames['#difficulty'] = 'difficulty';
                expressionAttributeValues[':difficulty'] = filters.difficulty;
            }
            if (filters.status) {
                filterConditions.push('#status = :status');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = filters.status;
            }
            if (filterConditions.length > 0) {
                filterExpression = filterConditions.join(' AND ');
            }
            const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: TABLE_NAME,
                // No IndexName needed - userId is the partition key
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: expressionAttributeValues,
                ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0
                    ? expressionAttributeNames
                    : undefined,
                FilterExpression: filterExpression,
                Limit: limit,
                ExclusiveStartKey: lastEvaluatedKey,
                ScanIndexForward: sortOrder === 'asc',
            }));
            return (result.Items || []);
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Query games by status
     */
    async queryByStatus(status, options = {}) {
        const { limit = 100, lastEvaluatedKey } = options;
        try {
            const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'StatusIndex',
                KeyConditionExpression: '#status = :status',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':status': status },
                Limit: limit,
                ExclusiveStartKey: lastEvaluatedKey,
            }));
            return (result.Items || []);
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
    /**
     * Delete game (admin only)
     */
    async delete(gameId, userId) {
        try {
            await docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: TABLE_NAME,
                Key: { userId: userId, gameId: gameId },
            }));
        }
        catch (error) {
            throw (0, error_mapper_1.mapDynamoDBError)(error);
        }
    }
}
exports.GameRepository = GameRepository;
//# sourceMappingURL=game.repository.js.map