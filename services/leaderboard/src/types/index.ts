/**
 * Type definitions for the Leaderboard Service
 */

export enum GameType {
  MEMORY_MATCH = 'MEMORY_MATCH',
  MATH_CHALLENGE = 'MATH_CHALLENGE',
  WORD_PUZZLE = 'WORD_PUZZLE',
  LANGUAGE_LEARNING = 'LANGUAGE_LEARNING',
  SUDOKU = 'SUDOKU',
  JIGSAW_PUZZLE = 'JIGSAW_PUZZLE',
  BUBBLE_POP = 'BUBBLE_POP',
  SEQUENCE_MEMORY = 'SEQUENCE_MEMORY',
  CODE_A_BOT = 'CODE_A_BOT',
  GEO_QUIZ = 'GEO_QUIZ',
  HISTORY_QUIZ = 'HISTORY_QUIZ',
  CIVICS_QUIZ = 'CIVICS_QUIZ',
  COLOR_BY_NUMBER = 'COLOR_BY_NUMBER',
  HANGMAN = 'HANGMAN',
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  MATH_MAZE = 'MATH_MAZE',
  OVERALL = 'OVERALL',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export interface PerformanceMetrics {
  // Memory Match
  attempts?: number;
  pairs?: number;

  // Math Challenge
  correctAnswers?: number;
  totalQuestions?: number;

  // Word Puzzle
  wordsFound?: number;
  totalWords?: number;

  // Language Learning
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
  sudoku: GameScoringConfig;
  jigsawPuzzle: GameScoringConfig;
  bubblePop: GameScoringConfig;
  sequenceMemory: GameScoringConfig;
  codeABot: GameScoringConfig;
  geoQuiz: GameScoringConfig;
  historyQuiz: GameScoringConfig;
  civicsQuiz: GameScoringConfig;
  colorByNumber: GameScoringConfig;
  hangman: GameScoringConfig;
  ticTacToe: GameScoringConfig;
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

export enum Timeframe {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

export interface LeaderboardEntry {
  gameType: GameType;
  scoreTimestamp: string; // Format: SCORE#{score}#TIMESTAMP#{isoTimestamp}
  userId: string;
  username: string;
  score: number;
  gameId: string;
  difficulty: Difficulty;
  completionTime: number;
  accuracy: number;
  timestamp: string; // ISO 8601
  date: string; // YYYY-MM-DD
  week: string; // YYYY-Www
  month: string; // YYYY-MM
  // Composite keys for GSI queries
  gameTypeDate?: string; // Format: GAMETYPE#YYYY-MM-DD
  gameTypeWeek?: string; // Format: GAMETYPE#YYYY-Www
  gameTypeMonth?: string; // Format: GAMETYPE#YYYY-MM
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
  lastPlayed: string; // ISO 8601
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
