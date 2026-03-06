export const APP_NAME = 'Memory Game'

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  GAME: '/game',
  GAME_SETUP: '/game/setup',
  DASHBOARD: '/dashboard',
  STATISTICS: '/dashboard/statistics',
  HISTORY: '/dashboard/history',
  ACHIEVEMENTS: '/dashboard/achievements',
  PROFILE: '/profile',
} as const

export const GAME_THEMES = [
  { id: 'ANIMALS', name: 'Animals', emoji: '🐶' },
  { id: 'FRUITS', name: 'Fruits', emoji: '🍎' },
  { id: 'VEHICLES', name: 'Vehicles', emoji: '🚗' },
  { id: 'SPACE', name: 'Space', emoji: '🚀' },
  { id: 'OCEAN', name: 'Ocean', emoji: '🐠' },
  { id: 'FORMULA1', name: 'Formula 1', emoji: '🏎️' },
] as const

export const DIFFICULTY_LEVELS = [
  { id: 'EASY', name: 'Easy', pairs: 6, description: '6 pairs - Perfect for beginners' },
  { id: 'MEDIUM', name: 'Medium', pairs: 8, description: '8 pairs - A good challenge' },
  { id: 'HARD', name: 'Hard', pairs: 10, description: '10 pairs - For memory masters' },
] as const

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  GAME_SETTINGS: 'game_settings',
} as const

export const QUERY_KEYS = {
  USER: 'user',
  GAME: 'game',
  GAME_HISTORY: 'game_history',
  STATISTICS: 'statistics',
  ACHIEVEMENTS: 'achievements',
} as const
