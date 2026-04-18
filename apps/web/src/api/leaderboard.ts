import { gql } from '@apollo/client'
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { fetchAuthSession } from 'aws-amplify/auth'
import { STORAGE_KEYS } from '@/config/constants'

// Create auth link for leaderboard
const createAuthLink = () => setContext(async (_, { headers }) => {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    
    if (token) {
      return {
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        },
      }
    }
  } catch (error) {
    console.error('[Leaderboard Auth] Error fetching session:', error)
  }
  
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Create error link
const createErrorLink = () => onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`[Leaderboard GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
    })
  }
  if (networkError) {
    console.error(`[Leaderboard Network error]: ${networkError}`)
  }
})

// Leaderboard Service Client
const leaderboardHttpLink = createHttpLink({
  uri: import.meta.env.VITE_LEADERBOARD_ENDPOINT || 
       import.meta.env.VITE_API_URL?.replace('/auth/', '/leaderboard/') ||
       'https://api.dashden.com/leaderboard/graphql',
})

export const leaderboardClient = new ApolloClient({
  link: from([createErrorLink(), createAuthLink(), leaderboardHttpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})

// GraphQL Queries
const GET_LEADERBOARD = gql`
  query GetLeaderboard($gameType: GameType!, $timeframe: Timeframe!, $limit: Int) {
    getLeaderboard(gameType: $gameType, timeframe: $timeframe, limit: $limit) {
      entries {
        rank
        userId
        username
        score
        gameType
        difficulty
        completionTime
        accuracy
        timestamp
        isCurrentUser
      }
      currentUserEntry {
        rank
        userId
        username
        score
        gameType
        difficulty
        completionTime
        accuracy
        timestamp
        isCurrentUser
      }
      totalEntries
      timeframe
    }
  }
`

const GET_USER_RANK = gql`
  query GetUserRank($gameType: GameType!, $timeframe: Timeframe!) {
    getUserRank(gameType: $gameType, timeframe: $timeframe) {
      rank
      score
      gameType
      timeframe
      totalPlayers
      percentile
    }
  }
`

const GET_USER_SCORE_HISTORY = gql`
  query GetUserScoreHistory($gameType: GameType, $limit: Int) {
    getUserScoreHistory(gameType: $gameType, limit: $limit) {
      rank
      userId
      username
      score
      gameType
      difficulty
      completionTime
      accuracy
      timestamp
      isCurrentUser
    }
  }
`

const CLEAR_ALL_RECORDS = gql`
  mutation ClearAllRecords {
    clearAllRecords {
      success
      message
    }
  }
`

// Types
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
  PATTERN_RECALL = 'PATTERN_RECALL',
  OVERALL = 'OVERALL',
}

export enum Timeframe {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME',
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  score: number
  gameType: GameType
  difficulty: string
  completionTime: number
  accuracy: number
  timestamp: string
  isCurrentUser: boolean
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  currentUserEntry: LeaderboardEntry | null
  totalEntries: number
  timeframe: Timeframe
}

export interface UserRankResponse {
  rank: number
  score: number
  gameType: GameType
  timeframe: Timeframe
  totalPlayers: number
  percentile: number
}

// API Functions
export const getLeaderboard = async (
  gameType: GameType,
  timeframe: Timeframe,
  limit: number = 100
): Promise<LeaderboardResponse> => {
  const { data } = await leaderboardClient.query({
    query: GET_LEADERBOARD,
    variables: { gameType, timeframe, limit },
    fetchPolicy: 'network-only',
  })
  return data.getLeaderboard
}

export const getUserRank = async (
  gameType: GameType,
  timeframe: Timeframe
): Promise<UserRankResponse | null> => {
  const { data } = await leaderboardClient.query({
    query: GET_USER_RANK,
    variables: { gameType, timeframe },
    fetchPolicy: 'network-only',
  })
  return data.getUserRank
}

export const getUserScoreHistory = async (
  gameType?: GameType,
  limit: number = 50
): Promise<LeaderboardEntry[]> => {
  const { data } = await leaderboardClient.query({
    query: GET_USER_SCORE_HISTORY,
    variables: { gameType, limit },
    fetchPolicy: 'network-only',
  })
  return data.getUserScoreHistory
}

export const clearAllRecords = async (): Promise<{ success: boolean; message: string }> => {
  const { data } = await leaderboardClient.mutate({
    mutation: CLEAR_ALL_RECORDS,
  })
  return data.clearAllRecords
}
