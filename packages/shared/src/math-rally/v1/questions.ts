import { exactInt, formatExact, isCanonicalOption, reduce, addExact } from '../exact';
import type { KindWeight } from '../protocols';
import type { Rng } from '../rng';
import type { Exact, GeneratedQuestion, MathRallyDifficulty, QuestionKind } from '../types';

/**
 * Question generators of protocol v1 (MR2 FD, business-rules Section 2).
 * Operand slots (frozen with v1):
 *   add, sub, mul        [a, b]
 *   div                  [dividend, divisor]
 *   twoStep              [form, a, b, c]   form 0: a + b x c, 1: a x b - c, 2: (a + b) x c, 3: a - b x c
 *   fractionOf           [n, d, q]         n/d of q
 *   percentOf            [p, q]
 *   square               [n]
 *   negArith             [op, a, b]        op 0: +, 1: -, 2: x, 3: /
 *   fracAdd              [a, b, c, d]      a/b + c/d
 *   percentOfAny         [p, q]
 *   power                [base, exponent]
 *   sqrt                 [s]               root of s
 *   equation             [form, a, b]      form 0: x + a = b, 1: x - a = b, 2: a x = b
 */

export const KINDS_V1: Readonly<Record<MathRallyDifficulty, readonly KindWeight[]>> = Object.freeze({
  1: Object.freeze([
    { kind: 'add', weight: 50 },
    { kind: 'sub', weight: 50 },
  ]),
  2: Object.freeze([
    { kind: 'mul', weight: 30 },
    { kind: 'div', weight: 30 },
    { kind: 'add', weight: 20 },
    { kind: 'sub', weight: 20 },
  ]),
  3: Object.freeze([
    { kind: 'twoStep', weight: 25 },
    { kind: 'fractionOf', weight: 25 },
    { kind: 'percentOf', weight: 25 },
    { kind: 'square', weight: 25 },
  ]),
  4: Object.freeze([
    { kind: 'negArith', weight: 25 },
    { kind: 'equation', weight: 20 },
    { kind: 'fracAdd', weight: 15 },
    { kind: 'percentOfAny', weight: 15 },
    { kind: 'power', weight: 15 },
    { kind: 'sqrt', weight: 10 },
  ]),
} as Record<MathRallyDifficulty, readonly KindWeight[]>);

export const MAX_OPERAND_DRAWS = 64;

const FRACTION_OF_DENOMINATORS = [2, 3, 4, 5, 10] as const;
const PERCENT_OF_STEPS: Readonly<Record<number, number>> = { 10: 10, 25: 4, 50: 2 };
const POWER_PAIRS: readonly (readonly [number, number])[] = (() => {
  const pairs: [number, number][] = [];
  for (let b = 2; b <= 9; b++) {
    pairs.push([b, 2], [b, 3]);
  }
  for (let e = 4; e <= 9; e++) pairs.push([2, e]);
  return pairs;
})();

function nonZero(rng: Rng, min: number, max: number): number {
  const v = rng.nextInt(min, max - 1);
  return v >= 0 ? v + 1 : v; // maps min..max-1 onto min..max without 0
}

export function evalTwoStep(form: number, a: number, b: number, c: number): number {
  switch (form) {
    case 0:
      return a + b * c;
    case 1:
      return a * b - c;
    case 2:
      return (a + b) * c;
    default:
      return a - b * c;
  }
}

export function evalNegArith(op: number, a: number, b: number): Exact {
  switch (op) {
    case 0:
      return exactInt(a + b);
    case 1:
      return exactInt(a - b);
    case 2:
      return exactInt(a * b);
    default:
      return reduce(a, b);
  }
}

export function solveEquation(form: number, a: number, b: number): Exact {
  switch (form) {
    case 0:
      return exactInt(b - a);
    case 1:
      return exactInt(b + a);
    default:
      return reduce(b, a);
  }
}

/** One draw of operands; null means "redraw". */
function drawOnce(rng: Rng, difficulty: MathRallyDifficulty, kind: QuestionKind): GeneratedQuestion | null {
  switch (kind) {
    case 'add': {
      if (difficulty === 1) {
        const a = rng.nextInt(1, 19);
        const b = rng.nextInt(1, 20 - a);
        return { kind, operands: [a, b], answer: exactInt(a + b) };
      }
      const a = rng.nextInt(10, 89);
      const b = rng.nextInt(10, Math.min(89, 100 - a));
      return { kind, operands: [a, b], answer: exactInt(a + b) };
    }
    case 'sub': {
      if (difficulty === 1) {
        const a = rng.nextInt(2, 20);
        const b = rng.nextInt(1, a - 1);
        return { kind, operands: [a, b], answer: exactInt(a - b) };
      }
      const a = rng.nextInt(20, 100);
      const b = rng.nextInt(10, a - 1);
      return { kind, operands: [a, b], answer: exactInt(a - b) };
    }
    case 'mul': {
      const a = rng.nextInt(2, 10);
      const b = rng.nextInt(2, 10);
      return { kind, operands: [a, b], answer: exactInt(a * b) };
    }
    case 'div': {
      const divisor = rng.nextInt(2, 10);
      const q = rng.nextInt(2, 10);
      return { kind, operands: [divisor * q, divisor], answer: exactInt(q) };
    }
    case 'twoStep': {
      const form = rng.nextInt(0, 3);
      const a = rng.nextInt(2, 50);
      const b = rng.nextInt(2, 9);
      const c = rng.nextInt(2, 9);
      const v = evalTwoStep(form, a, b, c);
      if (v < 1 || v > 999) return null;
      return { kind, operands: [form, a, b, c], answer: exactInt(v) };
    }
    case 'fractionOf': {
      const d = rng.pick(FRACTION_OF_DENOMINATORS);
      const n = rng.nextInt(1, d - 1);
      const m = rng.nextInt(1, Math.floor(100 / d));
      return { kind, operands: [n, d, d * m], answer: exactInt(n * m) };
    }
    case 'percentOf': {
      const p = rng.pick([10, 25, 50] as const);
      const step = PERCENT_OF_STEPS[p] as number;
      const m = rng.nextInt(Math.ceil(10 / step), Math.floor(200 / step));
      const q = step * m;
      return { kind, operands: [p, q], answer: exactInt((p * q) / 100) };
    }
    case 'square': {
      const n = rng.nextInt(2, 12);
      return { kind, operands: [n], answer: exactInt(n * n) };
    }
    case 'negArith': {
      const op = rng.nextInt(0, 3);
      if (op === 3) {
        const b = nonZero(rng, -20, 20);
        const q = nonZero(rng, -20, 20);
        const a = b * q;
        if (a >= 0 && b >= 0) return null;
        return { kind, operands: [op, a, b], answer: exactInt(q) };
      }
      const a = nonZero(rng, -20, 20);
      const b = nonZero(rng, -20, 20);
      if (a > 0 && b > 0) return null;
      return { kind, operands: [op, a, b], answer: evalNegArith(op, a, b) };
    }
    case 'fracAdd': {
      const b = rng.nextInt(2, 10);
      const d = rng.nextInt(2, 10);
      const a = rng.nextInt(1, b - 1);
      const c = rng.nextInt(1, d - 1);
      return { kind, operands: [a, b, c, d], answer: addExact(reduce(a, b), reduce(c, d)) };
    }
    case 'percentOfAny': {
      const p = 5 * rng.nextInt(1, 19);
      const q = 20 * rng.nextInt(1, 20);
      return { kind, operands: [p, q], answer: exactInt((p * q) / 100) };
    }
    case 'power': {
      const [base, e] = rng.pick(POWER_PAIRS) as readonly [number, number];
      return { kind, operands: [base, e], answer: exactInt(base ** e) };
    }
    case 'sqrt': {
      const n = rng.nextInt(2, 31);
      return { kind, operands: [n * n], answer: exactInt(n) };
    }
    case 'equation': {
      const form = rng.nextInt(0, 2);
      const a = rng.nextInt(2, 12);
      const x = nonZero(rng, -20, 20);
      const b = form === 0 ? x + a : form === 1 ? x - a : a * x;
      return { kind, operands: [form, a, b], answer: exactInt(x) };
    }
  }
}

/** Draws operands until the answer is a canonical option (bounded, R-4). */
export function generateQuestionV1(rng: Rng, difficulty: MathRallyDifficulty, kind: QuestionKind): GeneratedQuestion {
  for (let i = 0; i < MAX_OPERAND_DRAWS; i++) {
    const q = drawOnce(rng, difficulty, kind);
    if (q && isCanonicalOption(formatExact(q.answer))) return q;
  }
  throw new Error(`Math Rally v1: no canonical ${kind} question in ${MAX_OPERAND_DRAWS} draws (difficulty ${difficulty})`);
}
