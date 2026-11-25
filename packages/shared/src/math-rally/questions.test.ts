import { formatExact, isCanonicalOption } from './exact';
import { createRng } from './rng';
import type { GeneratedQuestion, MathRallyDifficulty, QuestionKind } from './types';
import { KINDS_V1, evalNegArith, evalTwoStep, generateQuestionV1, solveEquation } from './v1/questions';

const RUNS = 1000;

function draws(d: MathRallyDifficulty, kind: QuestionKind, seed = 1): GeneratedQuestion[] {
  const rng = createRng(seed);
  return Array.from({ length: RUNS }, () => generateQuestionV1(rng, d, kind));
}

const value = (q: GeneratedQuestion) => q.answer.num / q.answer.den;
const inRange = (x: number, lo: number, hi: number) => x >= lo && x <= hi;

describe('every generated answer is canonical', () => {
  for (const d of [1, 2, 3, 4] as const) {
    for (const { kind } of KINDS_V1[d]) {
      it(`difficulty ${d} ${kind}`, () => {
        for (const q of draws(d, kind)) {
          expect(isCanonicalOption(formatExact(q.answer))).toBe(true);
          expect(q.operands.length).toBeLessThanOrEqual(4);
          for (const o of q.operands) expect(Math.abs(o)).toBeLessThanOrEqual(1000);
          if (d < 4) {
            expect(q.answer.num).toBeGreaterThan(0);
            for (const o of q.operands) expect(o).toBeGreaterThanOrEqual(0);
          }
        }
      });
    }
  }
});

describe('operand rules (functional design business-rules Section 2)', () => {
  it('Easy add and sub', () => {
    for (const q of draws(1, 'add')) {
      const [a, b] = q.operands as [number, number];
      expect(inRange(a, 1, 19) && inRange(b, 1, 19) && a + b <= 20).toBe(true);
    }
    for (const q of draws(1, 'sub')) {
      const [a, b] = q.operands as [number, number];
      expect(inRange(a, 2, 20) && inRange(b, 1, a - 1)).toBe(true);
    }
  });

  it('Medium mul, div, add, sub', () => {
    for (const q of draws(2, 'mul')) expect(q.operands.every((x) => inRange(x, 2, 10))).toBe(true);
    for (const q of draws(2, 'div')) {
      const [p, a] = q.operands as [number, number];
      expect(inRange(a, 2, 10) && p % a === 0 && inRange(p / a, 2, 10) && value(q) === p / a).toBe(true);
    }
    for (const q of draws(2, 'add')) {
      const [a, b] = q.operands as [number, number];
      expect(inRange(a, 10, 89) && inRange(b, 10, 89) && a + b <= 100).toBe(true);
    }
    for (const q of draws(2, 'sub')) {
      const [a, b] = q.operands as [number, number];
      expect(inRange(a, 20, 100) && inRange(b, 10, a - 1)).toBe(true);
    }
  });

  it('Hard kinds', () => {
    for (const q of draws(3, 'twoStep')) {
      const [form, a, b, c] = q.operands as [number, number, number, number];
      expect(inRange(form, 0, 3) && inRange(a, 2, 50) && inRange(b, 2, 9) && inRange(c, 2, 9)).toBe(true);
      expect(value(q)).toBe(evalTwoStep(form, a, b, c));
      expect(inRange(value(q), 1, 999)).toBe(true);
    }
    for (const q of draws(3, 'fractionOf')) {
      const [n, d, qty] = q.operands as [number, number, number];
      expect([2, 3, 4, 5, 10]).toContain(d);
      expect(inRange(n, 1, d - 1) && qty % d === 0 && inRange(qty, d, 100) && value(q) === (n * qty) / d).toBe(true);
    }
    for (const q of draws(3, 'percentOf')) {
      const [p, qty] = q.operands as [number, number];
      expect([10, 25, 50]).toContain(p);
      expect(inRange(qty, 10, 200) && Number.isInteger((p * qty) / 100) && value(q) === (p * qty) / 100).toBe(true);
    }
    for (const q of draws(3, 'square')) {
      const [n] = q.operands as [number];
      expect(inRange(n, 2, 12) && value(q) === n * n).toBe(true);
    }
  });

  it('Super Hard kinds', () => {
    for (const q of draws(4, 'negArith')) {
      const [op, a, b] = q.operands as [number, number, number];
      expect(a < 0 || b < 0).toBe(true);
      expect(b).not.toBe(0);
      if (op === 3) expect(inRange(value(q), -20, 20) && value(q) !== 0 && a === b * value(q)).toBe(true);
      else expect(inRange(a, -20, 20) && a !== 0 && inRange(b, -20, 20)).toBe(true);
      expect(q.answer).toEqual(evalNegArith(op, a, b));
    }
    for (const q of draws(4, 'fracAdd')) {
      const [a, b, c, d] = q.operands as [number, number, number, number];
      expect(inRange(b, 2, 10) && inRange(d, 2, 10) && inRange(a, 1, b - 1) && inRange(c, 1, d - 1)).toBe(true);
      expect(value(q)).toBeCloseTo(a / b + c / d, 10);
      expect(formatExact(q.answer).length).toBeLessThanOrEqual(4);
    }
    for (const q of draws(4, 'percentOfAny')) {
      const [p, qty] = q.operands as [number, number];
      expect(p % 5 === 0 && inRange(p, 5, 95) && qty % 20 === 0 && inRange(qty, 20, 400)).toBe(true);
      expect(value(q)).toBe((p * qty) / 100);
    }
    for (const q of draws(4, 'power')) {
      const [base, e] = q.operands as [number, number];
      expect((inRange(base, 2, 9) && (e === 2 || e === 3)) || (base === 2 && inRange(e, 4, 9))).toBe(true);
      expect(inRange(value(q), 4, 729)).toBe(true);
    }
    for (const q of draws(4, 'sqrt')) {
      const [s] = q.operands as [number];
      expect(inRange(value(q), 2, 31) && value(q) ** 2 === s).toBe(true);
    }
    for (const q of draws(4, 'equation')) {
      const [form, a, b] = q.operands as [number, number, number];
      expect(inRange(form, 0, 2) && inRange(a, 2, 12)).toBe(true);
      expect(inRange(value(q), -20, 20) && value(q) !== 0).toBe(true);
      expect(q.answer).toEqual(solveEquation(form, a, b));
    }
  });
});

describe('kind weights', () => {
  it.each([1, 2, 3, 4] as const)('difficulty %i stays within 3 points of the target over 10 000 draws', (d) => {
    const rng = createRng(99);
    const items = KINDS_V1[d].map((k) => ({ value: k.kind, weight: k.weight }));
    const total = items.reduce((s, i) => s + i.weight, 0);
    const counts = new Map<string, number>();
    for (let i = 0; i < 10000; i++) {
      const k = rng.weightedPick(items);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const i of items) {
      expect(Math.abs((counts.get(i.value) ?? 0) / 100 - (100 * i.weight) / total)).toBeLessThan(3);
    }
  });
});
