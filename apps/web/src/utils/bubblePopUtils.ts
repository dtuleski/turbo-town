/**
 * Bubble Pop Spelling Game Utilities
 */

export type BubbleDifficulty = 'easy' | 'medium' | 'hard'

export interface WordChallenge {
  word: string
  hint: string
  emoji: string
}

export interface Bubble {
  id: number
  letter: string
  x: number  // percentage position
  y: number  // percentage position
  popped: boolean
  isCorrect: boolean // is this letter part of the word
  delay: number // animation delay
  color: string // radial gradient CSS for the bubble
}

const EASY_WORDS: WordChallenge[] = [
  { word: 'CAT', hint: 'A furry pet that purrs', emoji: '🐱' },
  { word: 'DOG', hint: 'A loyal pet that barks', emoji: '🐶' },
  { word: 'SUN', hint: 'It shines in the sky', emoji: '☀️' },
  { word: 'FISH', hint: 'It swims in water', emoji: '🐟' },
  { word: 'BALL', hint: 'You throw and catch it', emoji: '⚽' },
  { word: 'TREE', hint: 'It has leaves and branches', emoji: '🌳' },
  { word: 'BIRD', hint: 'It flies in the sky', emoji: '🐦' },
  { word: 'CAKE', hint: 'A sweet birthday treat', emoji: '🎂' },
  { word: 'STAR', hint: 'It twinkles at night', emoji: '⭐' },
  { word: 'FROG', hint: 'A green animal that jumps', emoji: '🐸' },
  { word: 'MOON', hint: 'You see it at night', emoji: '🌙' },
  { word: 'RAIN', hint: 'Water falling from clouds', emoji: '🌧️' },
  { word: 'BOAT', hint: 'It floats on water', emoji: '⛵' },
  { word: 'BEAR', hint: 'A big furry animal', emoji: '🐻' },
  { word: 'DUCK', hint: 'It says quack', emoji: '🦆' },
  { word: 'LAMP', hint: 'It gives you light', emoji: '💡' },
  { word: 'BOOK', hint: 'You read stories in it', emoji: '📖' },
  { word: 'BELL', hint: 'It makes a ringing sound', emoji: '🔔' },
  { word: 'KITE', hint: 'It flies with the wind', emoji: '🪁' },
  { word: 'DRUM', hint: 'You hit it to make music', emoji: '🥁' },
]

const MEDIUM_WORDS: WordChallenge[] = [
  { word: 'GUITAR', hint: 'A stringed instrument', emoji: '🎸' },
  { word: 'PLANET', hint: 'Earth is one of these', emoji: '🪐' },
  { word: 'BRIDGE', hint: 'It crosses over water', emoji: '🌉' },
  { word: 'CASTLE', hint: 'Where kings and queens live', emoji: '🏰' },
  { word: 'ROCKET', hint: 'It flies to space', emoji: '🚀' },
  { word: 'PIRATE', hint: 'A sailor who seeks treasure', emoji: '🏴‍☠️' },
  { word: 'DRAGON', hint: 'A mythical fire-breathing creature', emoji: '🐉' },
  { word: 'JUNGLE', hint: 'A thick tropical forest', emoji: '🌴' },
  { word: 'RABBIT', hint: 'A fluffy animal with long ears', emoji: '🐰' },
  { word: 'PENCIL', hint: 'You write with it', emoji: '✏️' },
  { word: 'FLOWER', hint: 'It blooms in a garden', emoji: '🌺' },
  { word: 'TURTLE', hint: 'A slow animal with a shell', emoji: '🐢' },
  { word: 'CANDLE', hint: 'It has a flame on top', emoji: '🕯️' },
  { word: 'TROPHY', hint: 'You win it in a competition', emoji: '🏆' },
  { word: 'CAMERA', hint: 'You take photos with it', emoji: '📷' },
  { word: 'ISLAND', hint: 'Land surrounded by water', emoji: '🏝️' },
  { word: 'PARROT', hint: 'A colorful talking bird', emoji: '🦜' },
  { word: 'HAMMER', hint: 'A tool for hitting nails', emoji: '🔨' },
  { word: 'COOKIE', hint: 'A sweet baked snack', emoji: '🍪' },
  { word: 'WIZARD', hint: 'A magical person with a wand', emoji: '🧙' },
]

const HARD_WORDS: WordChallenge[] = [
  { word: 'ELEPHANT', hint: 'The largest land animal', emoji: '🐘' },
  { word: 'BUTTERFLY', hint: 'A colorful insect with wings', emoji: '🦋' },
  { word: 'TELESCOPE', hint: 'You look at stars through it', emoji: '🔭' },
  { word: 'SUBMARINE', hint: 'A vessel that goes underwater', emoji: '🚢' },
  { word: 'PINEAPPLE', hint: 'A tropical spiky fruit', emoji: '🍍' },
  { word: 'CROCODILE', hint: 'A large reptile with big jaws', emoji: '🐊' },
  { word: 'FIREWORKS', hint: 'Colorful explosions in the sky', emoji: '🎆' },
  { word: 'SNOWFLAKE', hint: 'A tiny ice crystal from the sky', emoji: '❄️' },
  { word: 'TREASURE', hint: 'Hidden gold and jewels', emoji: '💎' },
  { word: 'DINOSAUR', hint: 'An extinct giant reptile', emoji: '🦕' },
  { word: 'UMBRELLA', hint: 'It keeps you dry in rain', emoji: '☂️' },
  { word: 'SANDWICH', hint: 'Bread with filling inside', emoji: '🥪' },
  { word: 'KANGAROO', hint: 'An Australian jumping animal', emoji: '🦘' },
  { word: 'MUSHROOM', hint: 'It grows on the forest floor', emoji: '🍄' },
  { word: 'SCORPION', hint: 'An arachnid with a stinger tail', emoji: '🦂' },
  { word: 'MOUNTAIN', hint: 'A very tall natural formation', emoji: '🏔️' },
  { word: 'SKELETON', hint: 'The bones inside your body', emoji: '💀' },
  { word: 'AVOCADO', hint: 'A green creamy fruit', emoji: '🥑' },
  { word: 'DOLPHIN', hint: 'A smart ocean mammal', emoji: '🐬' },
  { word: 'VOLCANO', hint: 'A mountain that erupts lava', emoji: '🌋' },
]

const WORD_POOLS: Record<BubbleDifficulty, WordChallenge[]> = {
  easy: EASY_WORDS,
  medium: MEDIUM_WORDS,
  hard: HARD_WORDS,
}

export const ROUNDS_PER_GAME = 5
export const MAX_LIVES = 3

/** Pick N random unique words for a game session */
export function pickWords(difficulty: BubbleDifficulty, count: number = ROUNDS_PER_GAME): WordChallenge[] {
  const pool = [...WORD_POOLS[difficulty]]
  const picked: WordChallenge[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Color palettes for bubble variety
const BUBBLE_COLORS = [
  'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6, #2563eb)', // blue
  'radial-gradient(circle at 30% 30%, #f472b6, #ec4899, #db2777)', // pink
  'radial-gradient(circle at 30% 30%, #4ade80, #22c55e, #16a34a)', // green
  'radial-gradient(circle at 30% 30%, #facc15, #eab308, #ca8a04)', // yellow
  'radial-gradient(circle at 30% 30%, #c084fc, #a855f7, #9333ea)', // purple
  'radial-gradient(circle at 30% 30%, #fb923c, #f97316, #ea580c)', // orange
  'radial-gradient(circle at 30% 30%, #2dd4bf, #14b8a6, #0d9488)', // teal
  'radial-gradient(circle at 30% 30%, #f87171, #ef4444, #dc2626)', // red
]

/** Generate bubbles for a word: includes all correct letters + decoy letters */
export function generateBubbles(word: string, difficulty: BubbleDifficulty = 'easy'): Bubble[] {
  const letters = word.split('')
  // Add decoy letters (roughly same count as word length, min 4)
  const decoyCount = Math.max(4, Math.floor(word.length * 0.8))
  const decoys: string[] = []
  for (let i = 0; i < decoyCount; i++) {
    let letter: string
    do {
      letter = ALPHABET[Math.floor(Math.random() * 26)]
    } while (letters.includes(letter) && Math.random() > 0.3) // sometimes allow duplicates of correct letters
    decoys.push(letter)
  }

  const allLetters = [...letters.map(l => ({ letter: l, isCorrect: true })), ...decoys.map(l => ({ letter: l, isCorrect: false }))]

  // Shuffle
  for (let i = allLetters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allLetters[i], allLetters[j]] = [allLetters[j], allLetters[i]]
  }

  // Determine color count based on difficulty
  const colorCount = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 8

  // Position bubbles randomly, avoiding overlap
  const bubbles: Bubble[] = []
  const positions: { x: number; y: number }[] = []

  for (let i = 0; i < allLetters.length; i++) {
    let x: number, y: number
    let attempts = 0
    do {
      x = 5 + Math.random() * 80 // 5-85% to keep within bounds
      y = 5 + Math.random() * 75 // 5-80%
      attempts++
    } while (
      attempts < 50 &&
      positions.some(p => Math.abs(p.x - x) < 12 && Math.abs(p.y - y) < 14)
    )
    positions.push({ x, y })

    // Assign color
    let color: string
    if (difficulty === 'easy') {
      // Easy: 2 colors, randomly assigned (no visual hint)
      color = BUBBLE_COLORS[Math.floor(Math.random() * 2)]
    } else {
      // Medium: 4 colors, Hard: 8 colors — all random, no visual hint
      color = BUBBLE_COLORS[Math.floor(Math.random() * colorCount)]
    }

    bubbles.push({
      id: i,
      letter: allLetters[i].letter,
      x,
      y,
      popped: false,
      isCorrect: allLetters[i].isCorrect,
      delay: Math.random() * 0.5,
      color,
    })
  }

  return bubbles
}
