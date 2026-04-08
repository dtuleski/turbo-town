"use strict";
/**
 * Leaderboard Service
 *
 * Business logic for leaderboard management, including:
 * - Retrieving leaderboard rankings
 * - Calculating user ranks and percentiles
 * - Managing leaderboard entries and user aggregates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardService = void 0;
const leaderboard_repository_1 = require("../repositories/leaderboard.repository");
const aggregate_repository_1 = require("../repositories/aggregate.repository");
const types_1 = require("../types");
class LeaderboardService {
    constructor(leaderboardRepo, aggregateRepo) {
        this.leaderboardRepo = leaderboardRepo || new leaderboard_repository_1.LeaderboardRepository();
        this.aggregateRepo = aggregateRepo || new aggregate_repository_1.AggregateRepository();
    }
    /**
     * Get leaderboard with rankings for a specific game type and timeframe
     */
    async getLeaderboard(gameType, timeframe, userId, limit = 100) {
        let entries;
        // For OVERALL game type with time-based queries, aggregate across all game types
        if (gameType === 'OVERALL' && timeframe !== 'ALL_TIME') {
            entries = await this.getOverallTimeBasedLeaderboard(timeframe, limit);
        }
        // For ALL_TIME, use aggregates to show only best score per user
        else if (timeframe === 'ALL_TIME') {
            const aggregates = await this.aggregateRepo.getTopAggregates(gameType, limit);
            // For each aggregate, fetch the actual game entry with that best score
            // to get accurate time and accuracy data
            const entriesPromises = aggregates.map(async (agg) => {
                // Query for the specific game that achieved the best score
                const bestGameEntries = await this.leaderboardRepo.queryUserHistory(agg.userId, agg.gameType === 'OVERALL' ? undefined : agg.gameType, 100);
                // Find the entry with the best score - sort by score descending and take first
                const sortedEntries = bestGameEntries.sort((a, b) => b.score - a.score);
                const bestGame = sortedEntries[0];
                // If no game found, create a minimal entry (shouldn't happen but defensive)
                if (!bestGame) {
                    return {
                        gameId: '',
                        userId: agg.userId,
                        username: agg.username,
                        gameType: agg.gameType,
                        score: agg.bestScore,
                        scoreTimestamp: `SCORE#${String(agg.bestScore).padStart(10, '0')}#TIMESTAMP#${agg.lastPlayed}`,
                        difficulty: 'MEDIUM',
                        completionTime: 0,
                        accuracy: 0,
                        timestamp: agg.lastPlayed,
                        date: agg.lastPlayed.split('T')[0],
                        week: '',
                        month: agg.lastPlayed.substring(0, 7),
                        metadata: {},
                        suspicious: false,
                    };
                }
                return {
                    gameId: bestGame.gameId,
                    userId: agg.userId,
                    username: agg.username,
                    gameType: bestGame.gameType, // Use actual game type from entry
                    score: bestGame.score,
                    scoreTimestamp: `SCORE#${String(bestGame.score).padStart(10, '0')}#TIMESTAMP#${bestGame.timestamp}`,
                    difficulty: bestGame.difficulty,
                    completionTime: bestGame.completionTime,
                    accuracy: bestGame.accuracy,
                    timestamp: bestGame.timestamp,
                    date: bestGame.date,
                    week: bestGame.week,
                    month: bestGame.month,
                    metadata: bestGame.metadata || {},
                    suspicious: bestGame.suspicious || false,
                };
            });
            entries = await Promise.all(entriesPromises);
        }
        else {
            // For time-based queries with specific game type, use entries table
            entries = await this.leaderboardRepo.queryByGameTypeAndTimeframe({
                gameType,
                timeframe,
                limit,
            });
        }
        // Calculate ranks
        const entriesWithRank = this.calculateRanks(entries, userId);
        // Find current user's entry
        const currentUserEntry = entriesWithRank.find((entry) => entry.isCurrentUser);
        return {
            entries: entriesWithRank,
            currentUserEntry,
            totalEntries: entriesWithRank.length,
            timeframe,
        };
    }
    /**
     * Get OVERALL leaderboard for time-based queries (DAILY, WEEKLY, MONTHLY)
     * Aggregates best scores across all game types for each user in the time period
     */
    async getOverallTimeBasedLeaderboard(timeframe, limit) {
        // Get all game types (excluding OVERALL itself)
        const gameTypes = [
            types_1.GameType.MEMORY_MATCH,
            types_1.GameType.MATH_CHALLENGE,
            types_1.GameType.WORD_PUZZLE,
            types_1.GameType.LANGUAGE_LEARNING
        ];
        // Fetch entries for all game types in parallel
        const allEntriesPromises = gameTypes.map(gt => this.leaderboardRepo.queryByGameTypeAndTimeframe({
            gameType: gt,
            timeframe,
            limit: 1000, // Get more entries to ensure we capture all users
        }));
        const allEntriesArrays = await Promise.all(allEntriesPromises);
        const allEntries = allEntriesArrays.flat();
        // Group by user and sum scores
        const userScores = new Map();
        for (const entry of allEntries) {
            const existing = userScores.get(entry.userId);
            if (!existing) {
                userScores.set(entry.userId, {
                    username: entry.username,
                    totalScore: entry.score,
                    bestEntry: entry,
                });
            }
            else {
                existing.totalScore += entry.score;
                // Keep the entry with the best individual score for metadata
                if (entry.score > existing.bestEntry.score) {
                    existing.bestEntry = entry;
                }
            }
        }
        // Convert to leaderboard entries
        const entries = Array.from(userScores.entries()).map(([userId, data]) => ({
            gameId: data.bestEntry.gameId,
            userId,
            username: data.username,
            gameType: types_1.GameType.OVERALL,
            score: data.totalScore,
            scoreTimestamp: `SCORE#${String(data.totalScore).padStart(10, '0')}#TIMESTAMP#${data.bestEntry.timestamp}`,
            difficulty: data.bestEntry.difficulty,
            completionTime: data.bestEntry.completionTime,
            accuracy: data.bestEntry.accuracy,
            timestamp: data.bestEntry.timestamp,
            date: data.bestEntry.date,
            week: data.bestEntry.week,
            month: data.bestEntry.month,
            metadata: data.bestEntry.metadata || {},
            suspicious: data.bestEntry.suspicious || false,
        }));
        // Sort by total score descending and limit
        return entries.sort((a, b) => b.score - a.score).slice(0, limit);
    }
    /**
     * Get user's rank for a specific game type and timeframe
     */
    async getUserRank(userId, gameType, timeframe) {
        // Get all entries for the timeframe
        const entries = await this.leaderboardRepo.queryByGameTypeAndTimeframe({
            gameType,
            timeframe,
            limit: 10000, // Get all entries to calculate accurate rank
        });
        if (entries.length === 0) {
            return null;
        }
        // Find user's best score
        const userEntries = entries.filter((entry) => entry.userId === userId);
        if (userEntries.length === 0) {
            return null;
        }
        const bestUserScore = Math.max(...userEntries.map((entry) => entry.score));
        // Count entries with higher scores
        const higherScores = entries.filter((entry) => entry.score > bestUserScore);
        const rank = higherScores.length + 1;
        // Calculate percentile
        const totalPlayers = new Set(entries.map((entry) => entry.userId)).size;
        const percentile = ((totalPlayers - rank) / totalPlayers) * 100;
        return {
            rank,
            score: bestUserScore,
            gameType,
            timeframe,
            totalPlayers,
            percentile: Math.round(percentile * 100) / 100, // Round to 2 decimal places
        };
    }
    /**
     * Get user's score history
     */
    async getUserScoreHistory(userId, gameType, limit = 50) {
        return await this.leaderboardRepo.queryUserHistory(userId, gameType, limit);
    }
    /**
     * Create a new leaderboard entry
     */
    async createLeaderboardEntry(input) {
        return await this.leaderboardRepo.createEntry(input);
    }
    /**
     * Update user aggregate with new score
     */
    async updateUserAggregate(input) {
        await this.aggregateRepo.updateAggregate(input);
    }
    /**
     * Calculate ranks for leaderboard entries
     * Entries with the same score get the same rank
     */
    calculateRanks(entries, currentUserId) {
        // Sort by score descending (highest first)
        const sorted = [...entries].sort((a, b) => b.score - a.score);
        let currentRank = 1;
        let previousScore = null;
        return sorted.map((entry, index) => {
            // If score is different from previous, update rank
            if (previousScore !== null && entry.score < previousScore) {
                currentRank = index + 1;
            }
            previousScore = entry.score;
            return {
                ...entry,
                rank: currentRank,
                isCurrentUser: currentUserId ? entry.userId === currentUserId : false,
            };
        });
    }
}
exports.LeaderboardService = LeaderboardService;
//# sourceMappingURL=leaderboard.service.js.map