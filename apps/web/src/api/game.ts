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
