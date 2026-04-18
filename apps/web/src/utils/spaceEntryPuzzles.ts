/**
 * Space Entry Game — Math Puzzle Generator
 *
 * Generates age-appropriate math puzzles (ages 8-14) for each control parameter.
 * Correct answers yield the ideal parameter value; wrong answers feed the
 * player's (incorrect) value straight into the physics engine.
 */

import type { SpaceEntryDifficulty } from './spaceEntryConfig'

export interface MissionPuzzle {
  type: 'angle' | 'thruster' | 'lateral'
  question: string
  visual?: string
  correctAnswer: number
  unit: string
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
  const refAngles: Record<SpaceEntryDifficulty, number> = { easy: 8.5, medium: 7.25, hard: 7 }
  // Use integer answers for kids — round the reference angle
  const idealAnswer = Math.round(refAngles[difficulty])

  switch (difficulty) {
    case 'easy': {
      const a = randInt(70, 95)
      const b = 180 - a - idealAnswer
      return {
        type: 'angle',
        question: `A triangle has angles of ${a}° and ${b}°. What is the third angle?`,
        visual: '📐 △  A° + B° + ?° = 180°',
        correctAnswer: idealAnswer,
        unit: '°',
      }
    }

    case 'medium': {
      const y = randInt(1, 4)
      const x = 180 - idealAnswer - y
      return {
        type: 'angle',
        question: `Two supplementary angles add to 180°. One is ${x}°. The entry angle is 180° − ${x}° − ${y}°. What is it?`,
        visual: '📐 180° − X° − Y° = ?°',
        correctAnswer: idealAnswer,
        unit: '°',
      }
    }

    case 'hard': {
      const x = 90 - idealAnswer
      return {
        type: 'angle',
        question: `In a right triangle, one angle is 90° and another is ${x}°. What is the third angle?`,
        visual: '📐 90° + X° + ?° = 180°',
        correctAnswer: idealAnswer,
        unit: '°',
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
  targetLng: number,
): MissionPuzzle {
  // Correct answer = 0 (no lateral correction needed for perfect landing)
  // But the puzzle is framed so the player has to calculate it
  const offset = randInt(3, 12)
  const direction = Math.random() < 0.5 ? 'east' : 'west'
  // "You're X° off course to the east. What correction do you need?"
  // If off to the east, need negative correction. If west, positive.
  const answer = direction === 'east' ? -offset : offset
  const currentLng = targetLng + (direction === 'east' ? offset : -offset)
  const currentDir = currentLng >= 0 ? 'E' : 'W'
  const targetDir = targetLng >= 0 ? 'E' : 'W'

  return {
    type: 'lateral',
    question: `Current position: ${Math.abs(Math.round(currentLng))}°${currentDir}. Target: ${Math.abs(Math.round(targetLng))}°${targetDir}. What correction is needed? (negative = west, positive = east)`,
    visual: '↔️ Target − Current = ?°',
    correctAnswer: answer,
    unit: '°',
  }
}
