"use strict";
/**
 * Aggregate Repository
 *
 * Handles DynamoDB operations for the UserAggregates table.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateRepository = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
class AggregateRepository {
    constructor(tableName) {
        this.client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.tableName = tableName || process.env.USER_AGGREGATES_TABLE_NAME || 'UserAggregates';
    }
    /**
     * Get user aggregate for a specific game type
     */
    async getAggregate(userId, gameType) {
        const command = new client_dynamodb_1.GetItemCommand({
            TableName: this.tableName,
            Key: (0, util_dynamodb_1.marshall)({
                userId,
                gameType,
            }),
        });
        const result = await this.client.send(command);
        if (!result.Item) {
            return null;
        }
        return (0, util_dynamodb_1.unmarshall)(result.Item);
    }
    /**
     * Get top aggregates for leaderboard (sorted by best score)
     */
    async getTopAggregates(gameType, limit = 100) {
        let filterExpression;
        let expressionAttributeValues;
        if (gameType === 'OVERALL') {
            // For OVERALL, get all game types
            const command = new client_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                Limit: 1000,
            });
            const result = await this.client.send(command);
            if (!result.Items || result.Items.length === 0) {
                return [];
            }
            const aggregates = result.Items.map(item => (0, util_dynamodb_1.unmarshall)(item));
            // Group by userId and sum scores across all game types
            const userScores = new Map();
            for (const agg of aggregates) {
                const existing = userScores.get(agg.userId);
                if (!existing || agg.bestScore > existing.totalScore) {
                    userScores.set(agg.userId, {
                        username: agg.username,
                        totalScore: agg.bestScore, // Use best score across all games
                        lastPlayed: agg.lastPlayed,
                    });
                }
            }
            // Convert to UserAggregate format
            const overallAggregates = Array.from(userScores.entries()).map(([userId, data]) => ({
                userId,
                gameType: 'OVERALL',
                username: data.username,
                totalScore: data.totalScore,
                gamesPlayed: 0,
                averageScore: 0,
                bestScore: data.totalScore,
                lastPlayed: data.lastPlayed,
                dailyScore: 0,
                weeklyScore: 0,
                monthlyScore: 0,
                dailyGames: 0,
                weeklyGames: 0,
                monthlyGames: 0,
            }));
            return overallAggregates
                .sort((a, b) => b.bestScore - a.bestScore)
                .slice(0, limit);
        }
        else {
            // For specific game type
            const command = new client_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: 'gameType = :gameType',
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                    ':gameType': gameType,
                }),
                Limit: 1000,
            });
            const result = await this.client.send(command);
            if (!result.Items || result.Items.length === 0) {
                return [];
            }
            const aggregates = result.Items.map(item => (0, util_dynamodb_1.unmarshall)(item));
            return aggregates
                .sort((a, b) => b.bestScore - a.bestScore)
                .slice(0, limit);
        }
    }
    /**
     * Update user aggregate with new score
     */
    async updateAggregate(input) {
        const { userId, gameType, username, score, timestamp } = input;
        // Get existing aggregate or create new one
        const existing = await this.getAggregate(userId, gameType);
        const date = new Date(timestamp);
        const currentDate = date.toISOString().split('T')[0];
        const currentWeek = this.getISOWeek(date);
        const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (existing) {
            // Update existing aggregate
            const newTotalScore = existing.totalScore + score;
            const newGamesPlayed = existing.gamesPlayed + 1;
            const newAverageScore = newTotalScore / newGamesPlayed;
            const newBestScore = Math.max(existing.bestScore, score);
            // Check if we need to reset timeframe scores
            const existingDate = existing.lastPlayed.split('T')[0];
            const existingWeek = this.getISOWeek(new Date(existing.lastPlayed));
            const existingMonth = existing.lastPlayed.substring(0, 7);
            const dailyScore = existingDate === currentDate ? existing.dailyScore + score : score;
            const dailyGames = existingDate === currentDate ? existing.dailyGames + 1 : 1;
            const weeklyScore = existingWeek === currentWeek ? existing.weeklyScore + score : score;
            const weeklyGames = existingWeek === currentWeek ? existing.weeklyGames + 1 : 1;
            const monthlyScore = existingMonth === currentMonth ? existing.monthlyScore + score : score;
            const monthlyGames = existingMonth === currentMonth ? existing.monthlyGames + 1 : 1;
            const updated = {
                userId,
                gameType,
                username,
                totalScore: newTotalScore,
                gamesPlayed: newGamesPlayed,
                averageScore: newAverageScore,
                bestScore: newBestScore,
                lastPlayed: timestamp,
                dailyScore,
                weeklyScore,
                monthlyScore,
                dailyGames,
                weeklyGames,
                monthlyGames,
            };
            const command = new client_dynamodb_1.PutItemCommand({
                TableName: this.tableName,
                Item: (0, util_dynamodb_1.marshall)(updated),
            });
            await this.client.send(command);
            return updated;
        }
        else {
            // Create new aggregate
            const newAggregate = {
                userId,
                gameType,
                username,
                totalScore: score,
                gamesPlayed: 1,
                averageScore: score,
                bestScore: score,
                lastPlayed: timestamp,
                dailyScore: score,
                weeklyScore: score,
                monthlyScore: score,
                dailyGames: 1,
                weeklyGames: 1,
                monthlyGames: 1,
            };
            const command = new client_dynamodb_1.PutItemCommand({
                TableName: this.tableName,
                Item: (0, util_dynamodb_1.marshall)(newAggregate),
            });
            await this.client.send(command);
            return newAggregate;
        }
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
    /**
     * Clear all user aggregates (admin only)
     */
    async clearAllAggregates() {
        const { DeleteItemCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-dynamodb')));
        // Scan all items
        const scanCommand = new client_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            ProjectionExpression: 'userId, gameType',
        });
        const result = await this.client.send(scanCommand);
        if (!result.Items || result.Items.length === 0) {
            return;
        }
        // Delete each item
        for (const item of result.Items) {
            const deleteCommand = new DeleteItemCommand({
                TableName: this.tableName,
                Key: {
                    userId: item.userId,
                    gameType: item.gameType,
                },
            });
            await this.client.send(deleteCommand);
        }
    }
}
exports.AggregateRepository = AggregateRepository;
//# sourceMappingURL=aggregate.repository.js.map