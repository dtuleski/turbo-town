import type { Card, GameTheme, DifficultyLevel } from '@/types/game'

// Card values for each theme
const THEME_VALUES: Record<GameTheme, string[]> = {
  ANIMALS: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'],
  FRUITS: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑'],
  VEHICLES: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐'],
  SPACE: ['🚀', '🛸', '🌎', '🌙', '⭐', '☄️', '🪐', '🌟', '✨', '🌠'],
  OCEAN: ['🐠', '🐟', '🐡', '🦈', '🐙', '🦑', '🦀', '🦞', '🐚', '🐬'],
  FORMULA1: ['🔴 Ferrari', '🟢 Aston Martin', '🔵 Williams', '⚫ Mercedes', '🟠 McLaren', '🟡 RB', '⚪ Haas', '🟤 Kick Sauber', '🟣 Alpine', '🔷 Red Bull'],
}

// Number of pairs for each difficulty
const DIFFICULTY_PAIRS: Record<DifficultyLevel, number> = {
  EASY: 6,
  MEDIUM: 8,
  HARD: 10,
}

export const generateCards = (theme: GameTheme, difficulty: DifficultyLevel): Card[] => {
  const numPairs = DIFFICULTY_PAIRS[difficulty]
  const values = THEME_VALUES[theme].slice(0, numPairs)

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
  return card1.value === card2.value && card1.id !== card2.id
}

export const isGameComplete = (cards: Card[]): boolean => {
  return cards.every(card => card.isMatched)
}
