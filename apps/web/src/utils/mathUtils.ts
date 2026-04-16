export type MathOperation = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'power' | 'root'

export interface MathQuestion {
  question: string
  answer: number
  operation: MathOperation
}

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const generateAddition = (difficulty: string): MathQuestion => {
  const max = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100
  const a = getRandomInt(1, max)
  const b = getRandomInt(1, max)
  return {
    question: `${a} + ${b} = ?`,
    answer: a + b,
    operation: 'addition',
  }
}

const generateSubtraction = (difficulty: string): MathQuestion => {
  const max = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100
  const a = getRandomInt(1, max)
  const b = getRandomInt(1, a) // Ensure positive result
  return {
    question: `${a} - ${b} = ?`,
    answer: a - b,
    operation: 'subtraction',
  }
}

const generateMultiplication = (difficulty: string): MathQuestion => {
  const max = difficulty === 'medium' ? 12 : 20
  const a = getRandomInt(2, max)
  const b = getRandomInt(2, max)
  return {
    question: `${a} × ${b} = ?`,
    answer: a * b,
    operation: 'multiplication',
  }
}

const generateDivision = (difficulty: string): MathQuestion => {
  const max = difficulty === 'medium' ? 12 : 20
  const divisor = getRandomInt(2, max)
  const quotient = getRandomInt(2, max)
  const dividend = divisor * quotient
  return {
    question: `${dividend} ÷ ${divisor} = ?`,
    answer: quotient,
    operation: 'division',
  }
}

const generatePower = (): MathQuestion => {
  const base = getRandomInt(2, 10)
  const exponent = getRandomInt(2, 3)
  return {
    question: `${base}^${exponent} = ?`,
    answer: Math.pow(base, exponent),
    operation: 'power',
  }
}

const generateRoot = (): MathQuestion => {
  // Generate perfect squares for easier calculation
  const root = getRandomInt(2, 12)
  const number = root * root
  return {
    question: `√${number} = ?`,
    answer: root,
    operation: 'root',
  }
}

export const generateQuestion = (
  operations: readonly MathOperation[],
  difficulty: string,
  previousQuestion?: string
): MathQuestion => {
  const maxAttempts = 10
  for (let i = 0; i < maxAttempts; i++) {
    const operation = operations[Math.floor(Math.random() * operations.length)]
    let question: MathQuestion

    switch (operation) {
      case 'addition':
        question = generateAddition(difficulty)
        break
      case 'subtraction':
        question = generateSubtraction(difficulty)
        break
      case 'multiplication':
        question = generateMultiplication(difficulty)
        break
      case 'division':
        question = generateDivision(difficulty)
        break
      case 'power':
        question = generatePower()
        break
      case 'root':
        question = generateRoot()
        break
      default:
        question = generateAddition(difficulty)
    }

    if (question.question !== previousQuestion || i === maxAttempts - 1) {
      return question
    }
  }

  // Fallback (shouldn't reach here)
  return generateAddition(difficulty)
}

export const checkAnswer = (question: MathQuestion, userAnswer: number): boolean => {
  // Allow small floating point differences
  return Math.abs(question.answer - userAnswer) < 0.01
}
