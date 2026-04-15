// ── Maze Equation Generator ────────────────────────────────────────────────
// Generates math equations scaled by difficulty for Math Maze gates.
// All answers are guaranteed to be integers.

import type { DifficultyLevel, MazeOperation, MathEquation } from './mazeGenerator'

export interface EquationConfig {
  operations: MazeOperation[]
  maxOperand: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

// Perfect squares whose root is an integer, range 4–144
const PERFECT_SQUARES = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144] as const

// ── Config ─────────────────────────────────────────────────────────────────

export function getEquationConfig(difficulty: DifficultyLevel): EquationConfig {
  switch (difficulty) {
    case 'easy':
      return {
        operations: ['addition', 'subtraction'],
        maxOperand: 20,
      }
    case 'medium':
      return {
        operations: ['addition', 'subtraction', 'multiplication', 'division'],
        maxOperand: 50,
      }
    case 'hard':
      return {
        operations: [
          'addition', 'subtraction', 'multiplication', 'division',
          'power', 'root', 'algebra',
        ],
        maxOperand: 50,
      }
  }
}

// ── Equation Generators (per operation) ────────────────────────────────────

function generateAddition(maxOperand: number): MathEquation {
  const a = randInt(1, maxOperand)
  const b = randInt(1, maxOperand)
  return { display: `${a} + ${b} = ?`, answer: a + b, operation: 'addition' }
}

function generateSubtraction(maxOperand: number): MathEquation {
  // Ensure non-negative answer: a >= b
  let a = randInt(1, maxOperand)
  let b = randInt(1, maxOperand)
  if (a < b) [a, b] = [b, a]
  return { display: `${a} − ${b} = ?`, answer: a - b, operation: 'subtraction' }
}

function generateMultiplication(maxOperand: number): MathEquation {
  // Keep factors reasonable so the product isn't enormous
  const cap = Math.min(maxOperand, 12)
  const a = randInt(1, cap)
  const b = randInt(1, cap)
  return { display: `${a} × ${b} = ?`, answer: a * b, operation: 'multiplication' }
}

function generateDivision(maxOperand: number): MathEquation {
  // Generate clean quotient: pick answer and divisor, compute dividend
  const cap = Math.min(maxOperand, 12)
  const answer = randInt(1, cap)
  const divisor = randInt(2, cap)
  const dividend = answer * divisor
  return { display: `${dividend} ÷ ${divisor} = ?`, answer, operation: 'division' }
}

function generatePower(): MathEquation {
  // base 2–10, exponent 2–3
  const base = randInt(2, 10)
  const exp = randInt(2, 3)
  const answer = Math.pow(base, exp)
  return { display: `${base}^${exp} = ?`, answer, operation: 'power' }
}

function generateRoot(): MathEquation {
  // Square root of a perfect square (4–144)
  const square = pick(PERFECT_SQUARES)
  const answer = Math.round(Math.sqrt(square))
  return { display: `√${square} = ?`, answer, operation: 'root' }
}

function generateAlgebra(): MathEquation {
  // ax + b = c  →  x = (c - b) / a, must be integer
  const a = randInt(2, 9)
  const x = randInt(1, 20)
  const b = randInt(1, 30)
  const c = a * x + b
  return { display: `${a}x + ${b} = ${c}, x = ?`, answer: x, operation: 'algebra' }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a random math equation appropriate for the given difficulty.
 * All answers are guaranteed to be integers.
 */
export function generateEquation(difficulty: DifficultyLevel): MathEquation {
  const config = getEquationConfig(difficulty)
  const operation = pick(config.operations)

  switch (operation) {
    case 'addition':
      return generateAddition(config.maxOperand)
    case 'subtraction':
      return generateSubtraction(config.maxOperand)
    case 'multiplication':
      return generateMultiplication(config.maxOperand)
    case 'division':
      return generateDivision(config.maxOperand)
    case 'power':
      return generatePower()
    case 'root':
      return generateRoot()
    case 'algebra':
      return generateAlgebra()
  }
}

/**
 * Check whether the given answer matches the equation's correct answer.
 */
export function checkEquationAnswer(equation: MathEquation, answer: number): boolean {
  return answer === equation.answer
}
