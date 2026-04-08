"use strict";
/**
 * Leaderboard Repository
 *
 * Handles DynamoDB operations for the LeaderboardEntries table.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const types_1 = require("../types");
class LeaderboardRepository {
    constructor(tableName) {
        this.client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.tableName = tableName || process.env.LEADERBOARD_TABLE_NAME || 'LeaderboardEntries';
    }
    /**
     * Create a new leaderboard entry
     */
    async createEntry(input) {
        const timestamp = input.timestamp || new Date().toISOString();
        const date = new Date(timestamp);
        // Generate composite sort key: SCORE#{score}#TIMESTAMP#{timestamp}
        const scoreTimestamp = `SCORE#${input.score.toString().padStart(10, '0')}#TIMESTAMP#${timestamp}`;
        // Calculate timeframe values
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const weekStr = this.getISOWeek(date); // YYYY-Www
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        const entry = {
            gameType: input.gameType,
            scoreTimestamp,
            userId: input.userId,
            username: input.username,
            score: input.score,
            gameId: input.gameId,
            difficulty: input.difficulty,
            completionTime: input.completionTime,
            accuracy: input.accuracy,
            timestamp,
            date: dateStr,
            week: weekStr,
            month: monthStr,
            // Composite keys for GSI queries
            gameTypeDate: `${input.gameType}#${dateStr}`,
            gameTypeWeek: `${input.gameType}#${weekStr}`,
            gameTypeMonth: `${input.gameType}#${monthStr}`,
            metadata: input.metadata,
            suspicious: input.suspicious || false,
        };
        const command = new client_dynamodb_1.PutItemCommand({
            TableName: this.tableName,
            Item: (0, util_dynamodb_1.marshall)(entry, { removeUndefinedValues: true }),
        });
        await this.client.send(command);
        return entry;
    }
    /**
     * Query leaderboard entries by game type and timeframe
     */
    async queryByGameTypeAndTimeframe(input) {
        const { gameType, timeframe, limit = 100 } = input;
        let queryInput;
        switch (timeframe) {
            case types_1.Timeframe.DAILY: {
                const today = new Date().toISOString().split('T')[0];
                queryInput = {
                    TableName: this.tableName,
                    IndexName: 'DailyLeaderboardIndex',
                    KeyConditionExpression: '#gameTypeDate = :gameTypeDate',
                    ExpressionAttributeNames: {
                        '#gameTypeDate': 'gameTypeDate',
                    },
                    ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                        ':gameTypeDate': `${gameType}#${today}`,
                    }),
                    ScanIndexForward: false, // Descending order (highest scores first)
                    Limit: limit,
                };
                break;
            }
            case types_1.Timeframe.WEEKLY: {
                const thisWeek = this.getISOWeek(new Date());
                queryInput = {
                    TableName: this.tableName,
                    IndexName: 'WeeklyLeaderboardIndex',
                    KeyConditionExpression: '#gameTypeWeek = :gameTypeWeek',
                    ExpressionAttributeNames: {
                        '#gameTypeWeek': 'gameTypeWeek',
                    },
                    ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                        ':gameTypeWeek': `${gameType}#${thisWeek}`,
                    }),
                    ScanIndexForward: false,
                    Limit: limit,
                };
                break;
            }
            case types_1.Timeframe.MONTHLY: {
                const date = new Date();
                const thisMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                queryInput = {
                    TableName: this.tableName,
                    IndexName: 'MonthlyLeaderboardIndex',
                    KeyConditionExpression: '#gameTypeMonth = :gameTypeMonth',
                    ExpressionAttributeNames: {
                        '#gameTypeMonth': 'gameTypeMonth',
                    },
                    ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                        ':gameTypeMonth': `${gameType}#${thisMonth}`,
                    }),
                    ScanIndexForward: false,
                    Limit: limit,
                };
                break;
            }
            case types_1.Timeframe.ALL_TIME: {
                queryInput = {
                    TableName: this.tableName,
                    KeyConditionExpression: '#gameType = :gameType',
                    ExpressionAttributeNames: {
                        '#gameType': 'gameType',
                    },
                    ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                        ':gameType': gameType,
                    }),
                    ScanIndexForward: false,
                    Limit: limit,
                };
                break;
            }
            default:
                throw new Error(`Unknown timeframe: ${timeframe}`);
        }
        const command = new client_dynamodb_1.QueryCommand(queryInput);
        const result = await this.client.send(command);
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        return result.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
    }
    /**
     * Query user's score history
     */
    async queryUserHistory(userId, gameType, limit = 50) {
        const queryInput = {
            TableName: this.tableName,
            IndexName: 'UserScoreHistoryIndex',
            KeyConditionExpression: '#userId = :userId',
            ExpressionAttributeNames: {
                '#userId': 'userId',
            },
            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                ':userId': userId,
            }),
            ScanIndexForward: false, // Descending order (most recent first)
            Limit: limit,
        };
        // Add game type filter if provided
        if (gameType) {
            queryInput.FilterExpression = '#gameType = :gameType';
            queryInput.ExpressionAttributeNames['#gameType'] = 'gameType';
            queryInput.ExpressionAttributeValues = (0, util_dynamodb_1.marshall)({
                ':userId': userId,
                ':gameType': gameType,
            });
        }
        const command = new client_dynamodb_1.QueryCommand(queryInput);
        const result = await this.client.send(command);
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        return result.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
    }
    /**
     * Get ISO week string (YYYY-Www format)
     */
    getISOWeek(date) {
        const target = new Date(date.valueOf());
        const dayNumber = (date.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNumber + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
            target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        }
        const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
        return `${target.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    }
}
exports.LeaderboardRepository = LeaderboardRepository;
//# sourceMappingURL=leaderboard.repository.js.map