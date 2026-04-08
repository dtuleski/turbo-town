import { gql } from '@apollo/client'
import { gameClient } from './client'

// GraphQL Mutations
const START_GAME = gql`
  mutation StartGame($input: StartGameInput!) {
    startGame(input: $input) {
      id
      userId
      themeId
      difficulty
      status
      startedAt
      canPlay
      rateLimit {
        tier
        limit
        used
        remaining
        resetAt
      }
    }
  }
`

const COMPLETE_GAME = gql`
  mutation CompleteGame($input: CompleteGameInput!) {
    completeGame(input: $input) {
      id
      status
      completedAt
      completionTime
      attempts
      score
      scoreBreakdown {
        baseScore
        difficultyMultiplier
        speedBonus
        accuracyBonus
        finalScore
        difficulty
        completionTime
        accuracy
      }
      leaderboardRank
      achievements {
        type
        unlocked
        progress
        completedAt
      }
    }
  }
`

// GraphQL Queries
const GET_USER_STATISTICS = gql`
  query GetUserStatistics {
    getUserStatistics {
      totalGames
      totalCompletedGames
      averageScore
      bestScore
      averageCompletionTime
      fastestCompletionTime
      totalAttempts
      averageAttempts
      favoriteTheme {
        id
        name
      }
      favoriteDifficulty
      currentStreak
      longestStreak
    }
  }
`

const GET_GAME_HISTORY = gql`
  query GetGameHistory($input: GameHistoryInput!) {
    getGameHistory(input: $input) {
      games {
        id
        themeId
        themeName
        difficulty
        completedAt
        completionTime
        attempts
        score
      }
      pagination {
        total
        page
        pageSize
        hasMore
      }
    }
  }
`

const CAN_START_GAME = gql`
  query CanStartGame {
    canStartGame {
      canPlay
      rateLimit {
        tier
        limit
        used
        remaining
        resetAt
      }
      message
    }
  }
`

// API Functions
export interface StartGameInput {
  themeId: string
  difficulty: number // 1-5
}

export interface CompleteGameInput {
  gameId: string
  completionTime: number // seconds
  attempts: number
  // Optional performance metrics for different game types
  correctAnswers?: number // For Math Challenge, Language Learning
  totalQuestions?: number // For Math Challenge, Language Learning
  wordsFound?: number // For Word Puzzle
  totalWords?: number // For Word Puzzle
  hintsUsed?: number // Optional for all games
  pauseCount?: number // Optional for all games
}

export interface GameHistoryInput {
  page?: number
  pageSize?: number
  sortBy?: 'date' | 'score' | 'time'
  sortOrder?: 'asc' | 'desc'
  themeId?: string
  difficulty?: number
  startDate?: string
  endDate?: string
}

export const startGame = async (input: StartGameInput) => {
  const { data } = await gameClient.mutate({
    mutation: START_GAME,
    variables: { input },
  })
  return data.startGame
}

export const completeGame = async (input: CompleteGameInput) => {
  const { data } = await gameClient.mutate({
    mutation: COMPLETE_GAME,
    variables: { input },
    fetchPolicy: 'no-cache',
  })
  return data.completeGame
}

export const getUserStatistics = async () => {
  const { data } = await gameClient.query({
    query: GET_USER_STATISTICS,
    fetchPolicy: 'network-only', // Always fetch fresh data
  })
  return data.getUserStatistics
}

export const getGameHistory = async (input: GameHistoryInput = {}) => {
  const { data } = await gameClient.query({
    query: GET_GAME_HISTORY,
    variables: { input },
    fetchPolicy: 'network-only',
  })
  return data.getGameHistory
}

export const canStartGame = async () => {
  const { data } = await gameClient.query({
    query: CAN_START_GAME,
    fetchPolicy: 'network-only',
  })
  return data.canStartGame
}

const LIST_AVAILABLE_GAMES = gql`
  query ListAvailableGames {
    listAvailableGames {
      gameId
      title
      description
      icon
      route
      status
      displayOrder
      ageRange
      category
    }
  }
`

export interface GameCatalogItem {
  gameId: string
  title: string
  description: string
  icon: string
  route: string
  status: 'ACTIVE' | 'COMING_SOON' | 'MAINTENANCE'
  displayOrder: number
  ageRange: string
  category: string
}

export const listAvailableGames = async (): Promise<GameCatalogItem[]> => {
  const { data } = await gameClient.query({
    query: LIST_AVAILABLE_GAMES,
    fetchPolicy: 'network-only',
  })
  return data.listAvailableGames
}


// ── Reviews ────────────────────────────────────────────────────────────────────

const SUBMIT_GAME_REVIEW = gql`
  mutation SubmitGameReview($input: SubmitGameReviewInput!) {
    submitGameReview(input: $input) {
      success
    }
  }
`

const GET_USER_REVIEW = gql`
  query GetUserReview($gameType: String!) {
    getUserReview(gameType: $gameType) {
      rating
    }
  }
`

const GET_REVIEW_STATS = gql`
  query GetReviewStats {
    getReviewStats {
      perGame {
        gameType
        averageRating
        totalReviews
      }
      overall {
        gameType
        averageRating
        totalReviews
      }
    }
  }
`

export interface ReviewStats {
  gameType: string
  averageRating: number
  totalReviews: number
}

export const submitGameReview = async (gameType: string, rating: number): Promise<{ success: boolean }> => {
  const { data } = await gameClient.mutate({
    mutation: SUBMIT_GAME_REVIEW,
    variables: { input: { gameType, rating } },
  })
  return data.submitGameReview
}

export const getUserReview = async (gameType: string): Promise<number | null> => {
  const { data } = await gameClient.query({
    query: GET_USER_REVIEW,
    variables: { gameType },
    fetchPolicy: 'network-only',
  })
  return data.getUserReview?.rating ?? null
}

export const getReviewStats = async (): Promise<{ perGame: ReviewStats[]; overall: ReviewStats }> => {
  const { data } = await gameClient.query({
    query: GET_REVIEW_STATS,
    fetchPolicy: 'network-only',
  })
  return data.getReviewStats
}


// ── Email Preferences ──────────────────────────────────────────────────────

const GET_EMAIL_PREFS = gql`
  query GetEmailPrefs {
    getEmailPrefs {
      userId
      dailyDigest
    }
  }
`

const SET_EMAIL_PREFS = gql`
  mutation SetEmailPrefs($input: SetEmailPrefsInput!) {
    setEmailPrefs(input: $input) {
      userId
      dailyDigest
    }
  }
`

export const getEmailPrefs = async (): Promise<{ userId: string; dailyDigest: boolean }> => {
  const { data } = await gameClient.query({
    query: GET_EMAIL_PREFS,
    fetchPolicy: 'network-only',
  })
  return data.getEmailPrefs
}

export const setEmailPrefs = async (dailyDigest: boolean): Promise<{ userId: string; dailyDigest: boolean }> => {
  const { data } = await gameClient.mutate({
    mutation: SET_EMAIL_PREFS,
    variables: { input: { dailyDigest } },
  })
  return data.setEmailPrefs
}


// ── Admin Email Preferences ────────────────────────────────────────────────

const ADMIN_SET_EMAIL_PREFS = gql`
  mutation AdminSetEmailPrefs($input: AdminSetEmailPrefsInput!) {
    adminSetEmailPrefs(input: $input) {
      userId
      dailyDigest
    }
  }
`

const ADMIN_GET_ALL_EMAIL_PREFS = gql`
  query AdminGetAllEmailPrefs {
    adminGetAllEmailPrefs {
      users {
        userId
        email
        username
        dailyDigest
      }
    }
  }
`

export const adminSetEmailPrefs = async (userId: string, email: string, username: string, dailyDigest: boolean) => {
  const { data } = await gameClient.mutate({
    mutation: ADMIN_SET_EMAIL_PREFS,
    variables: { input: { userId, email, username, dailyDigest } },
  })
  return data.adminSetEmailPrefs
}

export const adminGetAllEmailPrefs = async (): Promise<{ userId: string; email: string; username: string; dailyDigest: boolean }[]> => {
  const { data } = await gameClient.query({
    query: ADMIN_GET_ALL_EMAIL_PREFS,
    fetchPolicy: 'network-only',
  })
  return data.adminGetAllEmailPrefs.users
}
