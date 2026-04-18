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

/** Round to one decimal place */
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/* ------------------------------------------------------------------ */
/*  Angle Puzzles                                                      */
/* ------------------------------------------------------------------ */

export function generateAnglePuzzle(difficulty: SpaceEntryDifficulty): MissionPuzzle {
  switch (difficulty) {
    case 'easy': {
      // "A triangle has angles A° and B°. What is the third angle?"
      // answer is between 5-12
      const answer = randInt(5, 12)
      const a = randInt(70, 95)
      const b = 180 - a - answer
      return {
        type: 'angle',
        question: `A triangle has angles of ${a}° and ${b}°. What is the third angle?`,
        visual: '📐 △  A° + B° + ?° = 180°',
        correctAnswer: answer,
        unit: '°',
      }
    }

    case 'medium': {
      // "Two supplementary angles: one is X°. What is 180° - X - Y°?"
      // answer between 5.5-9 (use integers or .5)
      const halfAnswer = randInt(11, 18) // 5.5 to 9.0 in half-steps
      const answer = halfAnswer / 2
      const y = randInt(1, 4)
      const x = 180 - answer - y
      return {
        type: 'angle',
        question: `Two supplementary angles add to 180°. One is ${x}°. The entry angle is 180° − ${x}° − ${y}°. What is it?`,
        visual: '📐 180° − X° − Y° = ?°',
        correctAnswer: answer,
        unit: '°',
      }
    }

    case 'hard': {
      // "In a right triangle, one angle is X°. The entry angle equals 90° - X°."
      // answer 6-8
      const answer = randInt(6, 8)
      const x = 90 - answer
      return {
        type: 'angle',
        question: `In a right triangle, one angle is 90° and another is ${x}°. What is the third angle?`,
        visual: '📐 90° + X° + ?° = 180°',
        correctAnswer: answer,
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
  switch (difficulty) {
    case 'medium': {
      // "Fuel tank: X liters. Mission needs Y liters. What percentage should you use?"
      // answer 50-80%
      const answer = randInt(50, 80)
      // pick a tank size that divides cleanly
      const tank = randInt(2, 5) * 100 // 200, 300, 400, 500
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
      // "Spacecraft mass: X kg. Required thrust: Y N. Each 1% power = Z N.
      //  What power level do you need?"
      // answer 60-80%
      const answer = randInt(60, 80)
      const perPercent = randInt(5, 10) * 10 // 50-100 N per %
      const requiredThrust = answer * perPercent
      const mass = randInt(10, 30) * 100
      return {
        type: 'thruster',
        question: `Spacecraft mass: ${mass} kg. Required thrust: ${requiredThrust} N. Each 1% power gives ${perPercent} N. What power level (%) do you need?`,
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
  // Two variants, picked at random
  const variant = Math.random() < 0.5 ? 'offset' : 'correction'

  if (variant === 'offset') {
    // "Current longitude: X°E. Target: Y°E. What correction is needed?"
    const correction = randInt(-12, 12) || 1 // avoid 0
    const currentLng = round1(targetLng - correction)
    const dir = currentLng >= 0 ? 'E' : 'W'
    const targetDir = targetLng >= 0 ? 'E' : 'W'
    return {
      type: 'lateral',
      question: `Current longitude: ${Math.abs(round1(currentLng))}°${dir}. Target: ${Math.abs(round1(targetLng))}°${targetDir}. What correction is needed?`,
      visual: '↔️ Target − Current = ?°',
      correctAnswer: correction,
      unit: '°',
    }
  }

  // correction variant
  const off = randInt(1, 12)
  const eastWest = Math.random() < 0.5 ? 'east' : 'west'
  const answer = eastWest === 'east' ? -off : off
  return {
    type: 'lateral',
    question: `You're ${off}° off course to the ${eastWest}. What correction do you need?`,
    visual: `↔️ Off ${eastWest} → correct opposite`,
    correctAnswer: answer,
    unit: '°',
  }
}
