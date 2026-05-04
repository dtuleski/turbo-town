/**
 * Space Entry Game — Math Puzzle Generator
 *
 * Generates age-appropriate math puzzles (ages 8-14) for each control parameter.
 * Correct answers yield the ideal parameter value; wrong answers feed the
 * player's (incorrect) value straight into the physics engine.
 */

import type { SpaceEntryDifficulty } from './spaceEntryConfig'

export interface MissionPuzzle {
  type: 'angle' | 'thruster' | 'lateral' | 'bonus'
  question: string
  visual?: string
  correctAnswer: number
  unit: string
  label: string // display label for the puzzle card
  icon: string  // emoji icon for the puzzle card
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Random integer in [min, max] inclusive */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/* ------------------------------------------------------------------ */
/*  Angle Puzzles                                                      */
/* ------------------------------------------------------------------ */

export function generateAnglePuzzle(difficulty: SpaceEntryDifficulty): MissionPuzzle {
  // Import the reference angle so the correct answer = perfect landing
  const refAngles: Record<SpaceEntryDifficulty, number> = { easy: 8, medium: 7, hard: 7 }
  const idealAnswer = refAngles[difficulty]

  switch (difficulty) {
    case 'easy': {
      // Variant pool for easy — all triangle-angle problems
      const variant = randInt(0, 2)
      if (variant === 0) {
        const a = randInt(70, 95)
        const b = 180 - a - idealAnswer
        return {
          type: 'angle',
          question: `A triangle has angles of ${a}° and ${b}°. What is the third angle?`,
          visual: '📐 △  A° + B° + ?° = 180°',
          correctAnswer: idealAnswer,
          unit: '°',
          label: 'Entry Angle',
          icon: '📐',
        }
      }
      if (variant === 1) {
        const a = randInt(50, 80)
        const b = 180 - a - idealAnswer
        return {
          type: 'angle',
          question: `Two angles of a triangle are ${a}° and ${b}°. Find the missing angle.`,
          visual: '📐 △  A° + B° + ?° = 180°',
          correctAnswer: idealAnswer,
          unit: '°',
          label: 'Entry Angle',
          icon: '📐',
        }
      }
      // variant 2
      const total = randInt(30, 60)
      const other = total - idealAnswer
      return {
        type: 'angle',
        question: `Two angles add up to ${total}°. One is ${other}°. What is the other?`,
        visual: '📐 A° + ?° = total',
        correctAnswer: idealAnswer,
        unit: '°',
        label: 'Entry Angle',
        icon: '📐',
      }
    }

    case 'medium': {
      // Variant pool for medium
      const variant = randInt(0, 2)
      if (variant === 0) {
        const y = randInt(1, 4)
        const x = 180 - idealAnswer - y
        return {
          type: 'angle',
          question: `Two supplementary angles add to 180°. One is ${x}°. The entry angle is 180° − ${x}° − ${y}°. What is it?`,
          visual: '📐 180° − X° − Y° = ?°',
          correctAnswer: idealAnswer,
          unit: '°',
          label: 'Entry Angle',
          icon: '📐',
        }
      }
      if (variant === 1) {
        const multiplier = randInt(3, 8)
        const product = multiplier * idealAnswer
        return {
          type: 'angle',
          question: `A spacecraft's sensor reads ${product}°. The entry angle is 1/${multiplier} of that. What is the entry angle?`,
          visual: '📐 total ÷ ${multiplier} = ?°',
          correctAnswer: idealAnswer,
          unit: '°',
          label: 'Entry Angle',
          icon: '📐',
        }
      }
      // variant 2
      const a = randInt(40, 80)
      const b = randInt(40, 80)
      const c = a + b - idealAnswer
      return {
        type: 'angle',
        question: `Compute: ${a}° + ${b}° − ${c}° = ?°`,
        visual: '📐 A + B − C = ?°',
        correctAnswer: idealAnswer,
        unit: '°',
        label: 'Entry Angle',
        icon: '📐',
      }
    }

    case 'hard': {
      // Variant pool for hard — includes decimals
      const variant = randInt(0, 3)
      if (variant === 0) {
        const x = 90 - idealAnswer
        return {
          type: 'angle',
          question: `In a right triangle, one angle is 90° and another is ${x}°. What is the third angle?`,
          visual: '📐 90° + X° + ?° = 180°',
          correctAnswer: idealAnswer,
          unit: '°',
          label: 'Entry Angle',
          icon: '📐',
        }
      }
      if (variant === 1) {
        const a = randInt(50, 90)
        const b = 180 - a - idealAnswer
        return {
          type: 'angle',
          question: `A triangle's angles are ${a}°, ${b}°, and ?°. Solve for the missing angle.`,
          visual: '📐 △  ${a}° + ${b}° + ?° = 180°',
          correctAnswer: idealAnswer,
          unit: '°',
          label: 'Entry Angle',
          icon: '📐',
        }
      }
      if (variant === 2) {
        // Decimal variant: "X.Y + ? = Z" where answer = idealAnswer
        const decimalPart = randInt(1, 9) / 10 // 0.1 to 0.9
        const sum = idealAnswer + decimalPart + randInt(10, 30)
        const other = sum - idealAnswer
        const otherStr = other % 1 === 0 ? `${other}.0` : `${parseFloat(other.toFixed(1))}`
        return {
          type: 'angle',
          question: `Entry corridor: ${parseFloat(sum.toFixed(1))}° total. Atmospheric drag accounts for ${otherStr}°. What's the remaining entry angle?`,
          visual: '📐 total − drag = ?°',
          correctAnswer: idealAnswer,
          unit: '°',
          label: 'Entry Angle',
          icon: '📐',
        }
      }
      // variant 3: division
      const divisor = randInt(2, 6)
      const product = idealAnswer * divisor
      const offset = randInt(5, 20)
      return {
        type: 'angle',
        question: `Sensor reads ${product + offset}°. Subtract ${offset}°, then divide by ${divisor}. What's the entry angle?`,
        visual: '📐 (reading − offset) ÷ divisor = ?°',
        correctAnswer: idealAnswer,
        unit: '°',
        label: 'Entry Angle',
        icon: '📐',
      }
    }

    default:
      return generateAnglePuzzle('easy')
  }
}

/* ------------------------------------------------------------------ */
/*  Thruster Puzzles (medium / hard)                                   */
/* ------------------------------------------------------------------ */

export function generateThrusterPuzzle(difficulty: SpaceEntryDifficulty): MissionPuzzle {
  // Correct answer = optimal thruster power for the difficulty
  const optimalPowers: Record<SpaceEntryDifficulty, number> = { easy: 60, medium: 65, hard: 70 }
  const answer = optimalPowers[difficulty]

  switch (difficulty) {
    case 'medium': {
      const tank = randInt(2, 5) * 100
      const needed = Math.round((answer / 100) * tank)
      return {
        type: 'thruster',
        question: `Fuel tank: ${tank} liters. Mission needs ${needed} liters. What percentage of fuel should you use?`,
        visual: '🛢️ → 🚀  (needed / total) × 100',
        correctAnswer: answer,
        unit: '%',
        label: 'Thruster Power',
        icon: '🔥',
      }
    }

    case 'hard': {
      const perPercent = randInt(5, 10) * 10
      const requiredThrust = answer * perPercent
      return {
        type: 'thruster',
        question: `Required thrust: ${requiredThrust} N. Each 1% power gives ${perPercent} N. What power level (%) do you need?`,
        visual: '🚀 thrust ÷ N-per-% = ?%',
        correctAnswer: answer,
        unit: '%',
        label: 'Thruster Power',
        icon: '🔥',
      }
    }

    default:
      return generateThrusterPuzzle('medium')
  }
}

/* ------------------------------------------------------------------ */
/*  Lateral Puzzles (hard only)                                        */
/* ------------------------------------------------------------------ */

export function generateLateralPuzzle(
  _difficulty: SpaceEntryDifficulty,
  _targetLng: number,
): MissionPuzzle {
  // The correct answer for a perfect landing is 0° lateral correction.
  // The puzzle is framed as a math problem that equals 0.
  const variant = randInt(0, 4)

  if (variant === 0) {
    const a = randInt(3, 15)
    return {
      type: 'lateral',
      question: `Wind pushes your spacecraft ${a}° east, then ${a}° west. What is the net lateral correction needed?`,
      visual: '↔️ +X° then −X° = ?°',
      correctAnswer: 0,
      unit: '°',
      label: 'Lateral Correction',
      icon: '↔️',
    }
  }

  if (variant === 1) {
    const a = randInt(3, 15)
    return {
      type: 'lateral',
      question: `East atmospheric drift: +${a}°. West atmospheric drift: −${a}°. What total lateral correction do you need?`,
      visual: '↔️ (+X) + (−X) = ?°',
      correctAnswer: 0,
      unit: '°',
      label: 'Lateral Correction',
      icon: '↔️',
    }
  }

  if (variant === 2) {
    const a = randInt(5, 20)
    const b = randInt(5, 20)
    return {
      type: 'lateral',
      question: `Drift of +${a}° then −${b}° then −${a - b}°. What's the total correction?`,
      visual: '↔️ A + B + C = ?°',
      correctAnswer: 0,
      unit: '°',
      label: 'Lateral Correction',
      icon: '↔️',
    }
  }

  if (variant === 3) {
    const a = randInt(2, 8)
    const b = randInt(2, 8)
    return {
      type: 'lateral',
      question: `${a} × ${b} − ${a * b} = ? What lateral correction is needed?`,
      visual: '↔️ Solve: A × B − C = ?°',
      correctAnswer: 0,
      unit: '°',
      label: 'Lateral Correction',
      icon: '↔️',
    }
  }

  // variant 4
  const a = randInt(10, 30)
  const half = a / 2
  return {
    type: 'lateral',
    question: `Left thruster fires ${half}°, right thruster fires ${half}°. They cancel out. Net correction?`,
    visual: '↔️ left + right = ?°',
    correctAnswer: 0,
    unit: '°',
    label: 'Lateral Correction',
    icon: '↔️',
  }
}


/* ------------------------------------------------------------------ */
/*  Bonus Puzzle Labels & Icons (themed to space mission)              */
/* ------------------------------------------------------------------ */

const BONUS_LABELS: { label: string; icon: string }[] = [
  { label: 'Fuel Calculation', icon: '⛽' },
  { label: 'Orbit Velocity', icon: '🛰️' },
  { label: 'Shield Calibration', icon: '🛡️' },
  { label: 'Navigation Check', icon: '🧭' },
  { label: 'Comm Frequency', icon: '📡' },
  { label: 'Payload Balance', icon: '⚖️' },
  { label: 'Oxygen Reserve', icon: '💨' },
]

/* ------------------------------------------------------------------ */
/*  Bonus Puzzle Generators — varied math types                        */
/* ------------------------------------------------------------------ */

type BonusGenerator = (difficulty: SpaceEntryDifficulty) => MissionPuzzle

/** Multi-step arithmetic: a × b + c */
const genMultiStep: BonusGenerator = (difficulty) => {
  const meta = BONUS_LABELS[randInt(0, BONUS_LABELS.length - 1)]
  if (difficulty === 'easy') {
    const a = randInt(2, 5)
    const b = randInt(2, 5)
    const c = randInt(1, 10)
    return {
      type: 'bonus', question: `${a} × ${b} + ${c} = ?`,
      visual: '🔢 Solve the equation', correctAnswer: a * b + c, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  if (difficulty === 'medium') {
    const a = randInt(3, 8)
    const b = randInt(3, 8)
    const c = randInt(5, 20)
    return {
      type: 'bonus', question: `${a} × ${b} − ${c} = ?`,
      visual: '🔢 Solve the equation', correctAnswer: a * b - c, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  // hard
  const a = randInt(4, 12)
  const b = randInt(4, 12)
  const c = randInt(10, 30)
  const d = randInt(2, 5)
  return {
    type: 'bonus', question: `(${a} × ${b} − ${c}) ÷ ${d} = ?  (round down)`,
    visual: '🔢 Solve step by step', correctAnswer: Math.floor((a * b - c) / d), unit: '',
    label: meta.label, icon: meta.icon,
  }
}

/** Percentage / fraction: "What is X% of Y?" */
const genPercentage: BonusGenerator = (difficulty) => {
  const meta = BONUS_LABELS[randInt(0, BONUS_LABELS.length - 1)]
  if (difficulty === 'easy') {
    const pct = [10, 25, 50][randInt(0, 2)]
    const total = randInt(2, 10) * 20
    return {
      type: 'bonus', question: `What is ${pct}% of ${total}?`,
      visual: '📊 percentage × total ÷ 100', correctAnswer: (pct / 100) * total, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  if (difficulty === 'medium') {
    const pct = [15, 20, 25, 30, 75][randInt(0, 4)]
    const total = randInt(2, 8) * 40
    return {
      type: 'bonus', question: `What is ${pct}% of ${total}?`,
      visual: '📊 percentage × total ÷ 100', correctAnswer: (pct / 100) * total, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  // hard
  const pct = randInt(1, 9) * 5 + randInt(0, 1) * 5 // 5,10,15,...,50
  const total = randInt(3, 12) * 20
  return {
    type: 'bonus', question: `What is ${pct}% of ${total}?`,
    visual: '📊 percentage × total ÷ 100', correctAnswer: (pct / 100) * total, unit: '',
    label: meta.label, icon: meta.icon,
  }
}

/** Ratio / unit rate: "If X items cost Y, how much per item?" */
const genRatio: BonusGenerator = (difficulty) => {
  const meta = BONUS_LABELS[randInt(0, BONUS_LABELS.length - 1)]
  if (difficulty === 'easy') {
    const perUnit = randInt(2, 5)
    const units = randInt(2, 5)
    const total = perUnit * units
    return {
      type: 'bonus', question: `${units} rockets need ${total} fuel cells. How many fuel cells per rocket?`,
      visual: '🚀 total ÷ count = ?', correctAnswer: perUnit, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  if (difficulty === 'medium') {
    const perUnit = randInt(3, 8)
    const units = randInt(3, 7)
    const total = perUnit * units
    return {
      type: 'bonus', question: `${units} missions used ${total} kg of fuel total. How many kg per mission?`,
      visual: '⛽ total ÷ missions = ?', correctAnswer: perUnit, unit: 'kg',
      label: meta.label, icon: meta.icon,
    }
  }
  // hard
  const perUnit = randInt(5, 15)
  const units = randInt(4, 9)
  const total = perUnit * units
  return {
    type: 'bonus', question: `A fleet of ${units} ships consumed ${total} liters. What is the average per ship?`,
    visual: '⛽ total ÷ ships = ?', correctAnswer: perUnit, unit: 'L',
    label: meta.label, icon: meta.icon,
  }
}

/** Order of operations: "2 + 3 × 5 = ?" */
const genOrderOfOps: BonusGenerator = (difficulty) => {
  const meta = BONUS_LABELS[randInt(0, BONUS_LABELS.length - 1)]
  if (difficulty === 'easy') {
    const a = randInt(1, 5)
    const b = randInt(2, 4)
    const c = randInt(2, 4)
    return {
      type: 'bonus', question: `${a} + ${b} × ${c} = ?`,
      visual: '⚠️ Remember: multiply first!', correctAnswer: a + b * c, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  if (difficulty === 'medium') {
    const a = randInt(2, 8)
    const b = randInt(2, 6)
    const c = randInt(2, 6)
    const d = randInt(1, 5)
    return {
      type: 'bonus', question: `${a} + ${b} × ${c} − ${d} = ?`,
      visual: '⚠️ Multiply first, then add/subtract', correctAnswer: a + b * c - d, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  // hard
  const a = randInt(2, 6)
  const b = randInt(2, 6)
  const c = randInt(1, 5)
  const d = randInt(2, 4)
  return {
    type: 'bonus', question: `(${a} + ${b}) × ${c} − ${d} = ?`,
    visual: '⚠️ Parentheses first!', correctAnswer: (a + b) * c - d, unit: '',
    label: meta.label, icon: meta.icon,
  }
}

/** Negative numbers: "What is -A + B?" */
const genNegatives: BonusGenerator = (difficulty) => {
  const meta = BONUS_LABELS[randInt(0, BONUS_LABELS.length - 1)]
  if (difficulty === 'easy') {
    const a = randInt(1, 10)
    const b = randInt(a + 1, 20) // ensure positive result
    return {
      type: 'bonus', question: `−${a} + ${b} = ?`,
      visual: '🌡️ Think of a number line', correctAnswer: -a + b, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  if (difficulty === 'medium') {
    const a = randInt(5, 15)
    const b = randInt(1, a - 1) // negative result
    return {
      type: 'bonus', question: `${b} − ${a} = ?`,
      visual: '🌡️ Result can be negative', correctAnswer: b - a, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  // hard
  const a = randInt(5, 20)
  const b = randInt(5, 20)
  const c = randInt(1, 10)
  return {
    type: 'bonus', question: `−${a} + ${b} − ${c} = ?`,
    visual: '🌡️ Work left to right', correctAnswer: -a + b - c, unit: '',
    label: meta.label, icon: meta.icon,
  }
}

/** Exponents / squares: "What is A²?" or "What is √A?" */
const genPowers: BonusGenerator = (difficulty) => {
  const meta = BONUS_LABELS[randInt(0, BONUS_LABELS.length - 1)]
  if (difficulty === 'easy') {
    const a = randInt(2, 6)
    return {
      type: 'bonus', question: `What is ${a}²? (${a} × ${a})`,
      visual: '📐 Square the number', correctAnswer: a * a, unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  if (difficulty === 'medium') {
    const perfectSquares = [4, 9, 16, 25, 36, 49, 64]
    const sq = perfectSquares[randInt(0, perfectSquares.length - 1)]
    return {
      type: 'bonus', question: `What is √${sq}?`,
      visual: '📐 Find the square root', correctAnswer: Math.sqrt(sq), unit: '',
      label: meta.label, icon: meta.icon,
    }
  }
  // hard
  const a = randInt(2, 5)
  const b = randInt(2, 5)
  return {
    type: 'bonus', question: `${a}² + ${b}² = ?`,
    visual: '📐 Square each, then add', correctAnswer: a * a + b * b, unit: '',
    label: meta.label, icon: meta.icon,
  }
}

const ALL_BONUS_GENERATORS: BonusGenerator[] = [
  genMultiStep,
  genPercentage,
  genRatio,
  genOrderOfOps,
  genNegatives,
  genPowers,
]

/**
 * Generate a set of bonus puzzles for the mission.
 * Each puzzle uses a different generator to ensure variety.
 */
export function generateBonusPuzzles(
  difficulty: SpaceEntryDifficulty,
  count: number,
): MissionPuzzle[] {
  // Shuffle generators and pick `count` unique types
  const shuffled = [...ALL_BONUS_GENERATORS].sort(() => Math.random() - 0.5)
  const puzzles: MissionPuzzle[] = []
  for (let i = 0; i < count; i++) {
    const gen = shuffled[i % shuffled.length]
    puzzles.push(gen(difficulty))
  }
  return puzzles
}
