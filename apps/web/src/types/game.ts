export type GameTheme = 'ANIMALS' | 'FRUITS' | 'VEHICLES' | 'SPACE' | 'OCEAN' | 'FORMULA1'
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD'
export type GameStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'

export interface Card {
  id: string
  value: string
  isFlipped: boolean
  isMatched: boolean
}

export interface GameState {
  id?: string
  theme: GameTheme
  difficulty: DifficultyLevel
  cards: Card[]
  status: GameStatus
  attempts: number
  matches: number
  score: number
  startTime: number | null
  endTime: number | null
  elapsedTime: number
}

export interface StartGameInput {
  theme: GameTheme
  difficulty: DifficultyLevel
}

export interface CompleteGameInput {
  gameId: string
  attempts: number
  timeSeconds: number
  theme: GameTheme
  difficulty: DifficultyLevel
}

export interface Game {
  id: string
  userId: string
  theme: GameTheme
  difficulty: DifficultyLevel
  attempts: number
  timeSeconds: number
  score: number
  completedAt: string
}

export interface GameHistory {
  games: Game[]
  total: number
  hasMore: boolean
}

export interface UserStatistics {
  totalGames: number
  totalScore: number
  averageScore: number
  bestScore: number
  totalTime: number
  averageTime: number
  bestTime: number
  gamesWon: number
  winRate: number
  favoriteTheme: GameTheme
  favoriteDifficulty: DifficultyLevel
}

export interface Achievement {
  id: string
  type: string
  name: string
  description: string
  unlockedAt: string | null
  progress: number
  target: number
  isUnlocked: boolean
}
