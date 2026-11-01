import { gql } from '@apollo/client'
import { gameClient } from './client'
import { ROUTES } from '@/config/constants'
import type { QuestResultPayload } from '@/types/quest'
import { parseQuestParam } from '@/utils/questLaunch'
import { questResultStore } from '@/utils/questResultStore'

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
      quest {
        worldId
        nodeId
        kind
        score
        thresholds
        stars
        bestStars
        newlyUnlocked
        worldCleared
        badgesAwarded
        gauntlet {
          legIndex
          legsTotal
          status
          nextLeg {
            themeId
            difficulty
            params {
              levelId
              pageTheme
            }
          }
        }
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
  // Set by startGame itself from the page URL (Quest Map launch); callers never pass it.
  questContext?: { worldId: string; nodeId: string; legIndex: number }
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
  // Circuit Builder only. The server re-evaluates this layout; it never trusts a client score.
  circuitSubmission?: CircuitSubmissionInput
}

/**
 * Exactly the keys the server accepts inside `circuitSubmission` (strict schema). The completion
 * time is NOT part of it: it travels as the top-level `completionTime`.
 */
export interface CircuitSubmissionInput {
  levelId: string
  layout: {
    elements: readonly {
      id: string
      kind: string
      terminals: readonly [string, string]
      position: { col: number; row: number; rotation: number }
      params?: Readonly<Record<string, number>>
    }[]
    connections: readonly { id: string; from: string; to: string }[]
    gridSize: { cols: number; rows: number }
  }
  switches: Readonly<Record<string, 'open' | 'closed'>>
  environment: { sourceVoltage: number; lightLevel: number }
  faultCount: number
}

// Result shapes, derived from the selection sets of START_GAME and COMPLETE_GAME above.
export interface RateLimitInfo {
  tier: string
  limit: number
  used: number
  remaining: number
  resetAt: string
}

export interface StartGameResult {
  id: string
  userId: string
  themeId: string
  difficulty: number
  status: string
  startedAt: string
  canPlay: boolean
  rateLimit: RateLimitInfo | null
}

export interface ScoreBreakdownResult {
  baseScore: number
  difficultyMultiplier: number
  speedBonus: number
  accuracyBonus: number
  finalScore: number
  difficulty: number
  completionTime: number
  accuracy: number
}

export interface CompleteGameResult {
  id: string
  status: string
  completedAt: string
  completionTime: number
  attempts: number
  score: number
  scoreBreakdown: ScoreBreakdownResult | null
  leaderboardRank: number | null
  achievements: { type: string; unlocked: boolean; progress: number; completedAt: string | null }[]
  quest: QuestResultPayload | null
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

/** Same test the game pages use for a rate-limit failure. */
export const isRateLimitError = (error: unknown): boolean => {
  const e = error as { message?: unknown; graphQLErrors?: { extensions?: { code?: unknown } }[] } | null
  return (
    (typeof e?.message === 'string' && e.message.includes('Rate limit')) ||
    e?.graphQLErrors?.[0]?.extensions?.code === 'RATE_LIMIT_EXCEEDED'
  )
}

export const startGame = async (input: StartGameInput) => {
  const search = typeof window !== 'undefined' ? window.location.search : ''
  const ctx = parseQuestParam(search)
  // A new start always drops any stale quest result so it never leaks into a hub game.
  questResultStore.clear()

  if (!ctx) {
    const { data } = await gameClient.mutate({
      mutation: START_GAME,
      variables: { input },
    })
    return data.startGame
  }

  try {
    const { data } = await gameClient.mutate({
      mutation: START_GAME,
      variables: { input: { ...input, questContext: ctx } },
    })
    const result = data.startGame
    // R1: a quest start the server accepted is playable, even when this was the last allowed play.
    if (result && typeof result.id === 'string' && result.id !== '') {
      return { ...result, canPlay: true }
    }
    return result
  } catch (error) {
    // R1: any quest start failure goes back to the map; the caller never sees it.
    const reason = isRateLimitError(error) ? 'rate' : 'quest'
    console.error('Quest start failed:', reason)
    window.location.replace(`${ROUTES.QUEST_MAP}?startFailed=${reason}`)
    return new Promise<never>(() => {})
  }
}

export const completeGame = async (input: CompleteGameInput) => {
  const { data } = await gameClient.mutate({
    mutation: COMPLETE_GAME,
    variables: { input },
    fetchPolicy: 'no-cache',
  })
  const quest: QuestResultPayload | null = data.completeGame?.quest ?? null
  if (quest) {
    questResultStore.set(quest)
  } else {
    questResultStore.clear()
  }
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

// Contact Form
const SUBMIT_CONTACT_FORM = gql`
  mutation SubmitContactForm($input: ContactFormInput!) {
    submitContactForm(input: $input) {
      success
    }
  }
`

export interface ContactFormInput {
  type: 'bug' | 'feature' | 'question' | 'other'
  subject: string
  message: string
}

export const submitContactForm = async (input: ContactFormInput): Promise<{ success: boolean }> => {
  const { data } = await gameClient.mutate({
    mutation: SUBMIT_CONTACT_FORM,
    variables: { input },
  })
  return data.submitContactForm
}
