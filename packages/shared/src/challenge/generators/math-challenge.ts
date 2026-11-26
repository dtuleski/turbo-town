/**
 * Daily Challenge - Math Challenge generator. Port of `apps/web/src/utils/mathUtils.ts`
 * `generateQuestion` for the medium settings of `MathGamePage` (addition, subtraction,
 * multiplication, division), with `Math.random` replaced by the seeded rng. Like the page, a question
 * never repeats the one right before it.
 */
import { pick, randInt } from '../rng';
import type {
  ChallengeTotals,
  MathChallengeContent,
  MathChallengeOperation,
  MathChallengeQuestion,
  RotationEntry,
} from '../types';

const DEFAULT_QUESTIONS = 15;
const OPERATIONS: readonly MathChallengeOperation[] = ['addition', 'subtraction', 'multiplication', 'division'];
/** Medium operand limits of the web generator. */
const ADD_SUB_MAX = 50;
const MUL_DIV_MAX = 12;
const MAX_ATTEMPTS = 10;

function question(rng: () => number, operation: MathChallengeOperation): MathChallengeQuestion {
  switch (operation) {
    case 'addition': {
      const a = randInt(rng, 1, ADD_SUB_MAX);
      const b = randInt(rng, 1, ADD_SUB_MAX);
      return { question: `${a} + ${b} = ?`, answer: a + b, operation };
    }
    case 'subtraction': {
      const a = randInt(rng, 1, ADD_SUB_MAX);
      const b = randInt(rng, 1, a);
      return { question: `${a} - ${b} = ?`, answer: a - b, operation };
    }
    case 'multiplication': {
      const a = randInt(rng, 2, MUL_DIV_MAX);
      const b = randInt(rng, 2, MUL_DIV_MAX);
      return { question: `${a} × ${b} = ?`, answer: a * b, operation };
    }
    case 'division': {
      const divisor = randInt(rng, 2, MUL_DIV_MAX);
      const quotient = randInt(rng, 2, MUL_DIV_MAX);
      return { question: `${divisor * quotient} ÷ ${divisor} = ?`, answer: quotient, operation };
    }
  }
}

function nextQuestion(rng: () => number, previous?: string): MathChallengeQuestion {
  let q = question(rng, pick(rng, OPERATIONS));
  for (let i = 1; i < MAX_ATTEMPTS && q.question === previous; i++) {
    q = question(rng, pick(rng, OPERATIONS));
  }
  return q;
}

export function generateMathChallenge(entry: RotationEntry, rng: () => number): MathChallengeContent {
  const count = typeof entry.settings.questions === 'number' ? entry.settings.questions : DEFAULT_QUESTIONS;
  const questions: MathChallengeQuestion[] = [];
  for (let i = 0; i < count; i++) {
    questions.push(nextQuestion(rng, questions[i - 1]?.question));
  }
  return { kind: 'math-challenge', questions };
}

/** The web page reports one question per list entry. */
export function mathChallengeTotals(content: MathChallengeContent): ChallengeTotals {
  return { totalQuestions: content.questions.length };
}
