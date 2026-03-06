import type { Card, GameTheme, DifficultyLevel } from '@/types/game'

// Card values for each theme
const THEME_VALUES: Record<GameTheme, string[]> = {
  ANIMALS: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'],
  FRUITS: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑'],
  VEHICLES: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐'],
  SPACE: ['🚀', '🛸', '🌎', '🌙', '⭐', '☄️', '🪐', '🌟', '✨', '🌠'],
  OCEAN: ['🐠', '🐟', '🐡', '🦈', '🐙', '🦑', '🦀', '🦞', '🐚', '🐬'],
  FORMULA1: [], // Special handling - see F1_DRIVER_PAIRS
}

// F1 Driver pairs - each array contains two drivers from the same team (2025 season)
const F1_DRIVER_PAIRS: string[][] = [
  ['🔴 Leclerc', '🔴 Hamilton'],           // Ferrari
  ['⚫ Russell', '⚫ Antonelli'],           // Mercedes
  ['🟠 Norris', '🟠 Piastri'],             // McLaren
  ['🔷 Verstappen', '🔷 Hadjar'],          // Red Bull Racing
  ['🟢 Alonso', '🟢 Stroll'],              // Aston Martin
  ['🟡 Lawson', '🟡 Lindblad'],            // Racing Bulls
  ['🔵 Sainz', '🔵 Albon'],                // Williams
  ['⚪ Bearman', '⚪ Ocon'],                // Haas
  ['🟤 Bortoleto', '🟤 Hulkenberg'],       // Audi
  ['🟣 Gasly', '🟣 Colapinto'],            // Alpine
  ['🩵 Perez', '🩵 Bottas'],               // Cadillac
]

// Map to track which drivers are teammates (for matching logic)
const F1_TEAMMATE_MAP: Record<string, string> = {}
F1_DRIVER_PAIRS.forEach(([driver1, driver2]) => {
  F1_TEAMMATE_MAP[driver1] = driver2
  F1_TEAMMATE_MAP[driver2] = driver1
})

// Number of pairs for each difficulty
const DIFFICULTY_PAIRS: Record<DifficultyLevel, number> = {
  EASY: 6,
  MEDIUM: 8,
  HARD: 10,  // Standard themes have 10 values max
}

// F1-specific difficulty (11 teams)
const F1_DIFFICULTY_PAIRS: Record<DifficultyLevel, number> = {
  EASY: 6,
  MEDIUM: 8,
  HARD: 11,  // All 11 F1 teams for 2025 season
}

export const generateCards = (theme: GameTheme, difficulty: DifficultyLevel): Card[] => {
  // Special handling for Formula 1 theme
  if (theme === 'FORMULA1') {
    const numPairs = F1_DIFFICULTY_PAIRS[difficulty]
    const selectedTeams = F1_DRIVER_PAIRS.slice(0, numPairs)
    const cards: Card[] = []
    
    selectedTeams.forEach(([driver1, driver2], index) => {
      cards.push(
        {
          id: `${index}-driver1`,
          value: driver1,
          isFlipped: false,
          isMatched: false,
        },
        {
          id: `${index}-driver2`,
          value: driver2,
          isFlipped: false,
          isMatched: false,
        }
      )
    })
    
    return shuffleArray(cards)
  }
  
  // Standard handling for other themes
  const numPairs = DIFFICULTY_PAIRS[difficulty]
  const values = THEME_VALUES[theme]?.slice(0, numPairs) || []

  // Create pairs
  const cards: Card[] = []
  values.forEach((value, index) => {
    cards.push(
      {
        id: `${index}-1`,
        value,
        isFlipped: false,
        isMatched: false,
      },
      {
        id: `${index}-2`,
        value,
        isFlipped: false,
        isMatched: false,
      }
    )
  })

  // Shuffle cards
  return shuffleArray(cards)
}

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const calculateScore = (
  attempts: number,
  timeSeconds: number,
  difficulty: DifficultyLevel
): number => {
  const numPairs = DIFFICULTY_PAIRS[difficulty]
  const perfectAttempts = numPairs
  const maxTime = numPairs * 60 // 60 seconds per pair

  // Base score (0-1000)
  const attemptScore = Math.max(0, 500 - (attempts - perfectAttempts) * 10)
  const timeScore = Math.max(0, 500 - (timeSeconds / maxTime) * 500)

  // Difficulty multiplier
  const multiplier = difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 1.5 : 2

  return Math.round((attemptScore + timeScore) * multiplier)
}

export const checkMatch = (card1: Card, card2: Card): boolean => {
  // Don't match the same card
  if (card1.id === card2.id) return false
  
  // Check if this is F1 theme (driver names start with emoji)
  const isF1 = F1_TEAMMATE_MAP[card1.value] !== undefined
  
  if (isF1) {
    // For F1, check if the two drivers are teammates
    return F1_TEAMMATE_MAP[card1.value] === card2.value
  }
  
  // For other themes, check if values are identical
  return card1.value === card2.value
}

export const isGameComplete = (cards: Card[]): boolean => {
  return cards.every(card => card.isMatched)
}
