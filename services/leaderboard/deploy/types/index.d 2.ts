/**
 * Type definitions for the Leaderboard Service
 */
export declare enum GameType {
    MEMORY_MATCH = "MEMORY_MATCH",
    MATH_CHALLENGE = "MATH_CHALLENGE",
    WORD_PUZZLE = "WORD_PUZZLE",
    LANGUAGE_LEARNING = "LANGUAGE_LEARNING",
    OVERALL = "OVERALL"
}
export declare enum Difficulty {
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD",
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED"
}
export interface PerformanceMetrics {
    attempts?: number;
    pairs?: number;
    correctAnswers?: number;
    totalQuestions?: number;
    wordsFound?: number;
    totalWords?: number;
    correctMatches?: number;
    totalAttempts?: number;
}
export interface ScoreBreakdown {
    baseScore: number;
    difficultyMultiplier: number;
    speedBonus: number;
    accuracyBonus: number;
    finalScore: number;
    difficulty: string;
    completionTime: number;
    accuracy: number;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export interface ScoringConfig {
    memoryMatch: GameScoringConfig;
    mathChallenge: GameScoringConfig;
    wordPuzzle: GameScoringConfig;
    languageLearning: GameScoringConfig;
}
export interface GameScoringConfig {
    baseScore: number;
    difficultyMultipliers: {
        [key: string]: number;
    };
    speedBonusParams: {
        maxTime: number;
        formula: string;
    };
    accuracyBonusParams: {
        formula: string;
    };
    validationRules: {
        minCompletionTime: number;
        maxCompletionTime: number;
        minScore: number;
        maxScore: number;
    };
}
export interface CalculateScoreInput {
    gameType: GameType;
    difficulty: Difficulty;
    completionTime: number;
    performanceMetrics: PerformanceMetrics;
}
export declare enum Timeframe {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    ALL_TIME = "ALL_TIME"
}
export interface LeaderboardEntry {
    gameType: GameType;
    scoreTimestamp: string;
    userId: string;
    username: string;
    score: number;
    gameId: string;
    difficulty: Difficulty;
    completionTime: number;
    accuracy: number;
    timestamp: string;
    date: string;
    week: string;
    month: string;
    gameTypeDate?: string;
    gameTypeWeek?: string;
    gameTypeMonth?: string;
    metadata?: Record<string, any>;
    suspicious?: boolean;
}
export interface UserAggregate {
    userId: string;
    gameType: GameType;
    username: string;
    totalScore: number;
    gamesPlayed: number;
    averageScore: number;
    bestScore: number;
    lastPlayed: string;
    dailyScore: number;
    weeklyScore: number;
    monthlyScore: number;
    dailyGames: number;
    weeklyGames: number;
    monthlyGames: number;
}
export interface CreateLeaderboardEntryInput {
    gameId: string;
    userId: string;
    username: string;
    gameType: GameType;
    score: number;
    difficulty: Difficulty;
    completionTime: number;
    accuracy: number;
    timestamp: string;
    metadata?: Record<string, any>;
    suspicious?: boolean;
}
export interface QueryLeaderboardInput {
    gameType: GameType;
    timeframe: Timeframe;
    limit?: number;
}
export interface UpdateAggregateInput {
    userId: string;
    gameType: GameType;
    username: string;
    score: number;
    timestamp: string;
}
export interface LeaderboardResponse {
    entries: LeaderboardEntryWithRank[];
    currentUserEntry?: LeaderboardEntryWithRank;
    totalEntries: number;
    timeframe: Timeframe;
}
export interface LeaderboardEntryWithRank extends LeaderboardEntry {
    rank: number;
    isCurrentUser: boolean;
}
export interface UserRankResponse {
    rank: number;
    score: number;
    gameType: GameType;
    timeframe: Timeframe;
    totalPlayers: number;
    percentile: number;
}
//# sourceMappingURL=index.d.ts.map