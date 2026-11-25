import { exactInt, parseOption, reduce, sameValue } from './exact';
import { createRng } from './rng';
import type { GeneratedQuestion, MathRallyDifficulty } from './types';
import { buildDistractors, buildOptionsV1, ruleCandidates } from './v1/distractors';
import { KINDS_V1, generateQuestionV1 } from './v1/questions';

const q = (kind: GeneratedQuestion['kind'], operands: number[], num: number, den = 1): GeneratedQuestion => ({
  kind,
  operands,
  answer: reduce(num, den),
});

const values = (c: { candidates: { value: { num: number; den: number } }[] }) =>
  c.candidates.map((x) => x.value.num / x.value.den);

describe('mistake rules on worked examples', () => {
  it('fraction addition keeps the unreduced "added numerators and denominators" form', () => {
    const groups = ruleCandidates(q('fracAdd', [1, 2, 1, 4], 3, 4));
    expect(groups[0]!.rule).toBe('addedNumAndDen');
    expect(groups[0]!.candidates[0]!.text).toBe('2/6');
    const opts = buildOptionsV1(createRng(1), q('fracAdd', [1, 2, 1, 4], 3, 4), 4, 4);
    expect(opts[0]).toBe('3/4');
    expect(opts).toContain('2/6');
  });

  it('swapped digits never produces a leading zero', () => {
    const groups = ruleCandidates(q('add', [25, 25], 50));
    const swapped = groups.find((g) => g.rule === 'swappedDigits')!;
    expect(values(swapped)).toEqual([]);
    const g2 = ruleCandidates(q('add', [30, 42], 72)).find((g) => g.rule === 'swappedDigits')!;
    expect(values(g2)).toEqual([27]);
  });

  it('order-of-operations mistake per two-step form', () => {
    expect(values(ruleCandidates(q('twoStep', [0, 3, 4, 5], 23))[0]!)).toEqual([35]); // (3 + 4) x 5
    expect(values(ruleCandidates(q('twoStep', [1, 3, 4, 2], 10))[0]!)).toEqual([6]); // 3 x (4 - 2)
    expect(values(ruleCandidates(q('twoStep', [2, 3, 4, 5], 35))[0]!)).toEqual([23]); // 3 + 4 x 5
    expect(values(ruleCandidates(q('twoStep', [3, 30, 4, 5], 10))[0]!)).toEqual([130]); // (30 - 4) x 5
  });

  it('times tables use neighbouring products first', () => {
    expect(values(ruleCandidates(q('mul', [7, 8], 56))[0]!).sort((a, b) => a - b)).toEqual([48, 49, 63, 64]);
  });

  it('equations use the wrong inverse', () => {
    expect(values(ruleCandidates(q('equation', [0, 5, 3], -2))[0]!)).toEqual([8]); // x + 5 = 3 -> 3 + 5
    expect(values(ruleCandidates(q('equation', [2, 4, -12], -3))[0]!)).toEqual([-48]);
  });
});

describe('filter', () => {
  it('no negative option below difficulty 4', () => {
    const d = buildDistractors(createRng(3), q('sub', [3, 2], 1), 1, 1);
    expect(parseOption(d[0]!.text)!.num).toBeGreaterThanOrEqual(0);
  });

  it('options are distinct by value and never value-equal to the answer', () => {
    // 1/2 + 1/2 = 1; the naive 2/4 equals 1/2, which is not the answer, so it may appear once.
    const opts = buildOptionsV1(createRng(5), q('fracAdd', [1, 2, 1, 2], 1), 4, 4);
    const vals = opts.map((o) => parseOption(o)!);
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) expect(sameValue(vals[i]!, vals[j]!)).toBe(false);
    }
    expect(opts[0]).toBe('1');
  });

  it('falls back to near values when the rules run out (small range)', () => {
    // 2 - 1 = 1 at Easy: wrong op 3, off by 1 gives 0 and 2, off by 2 gives 3; 4 paths needs near values too.
    for (let seed = 0; seed < 200; seed++) {
      const d = buildDistractors(createRng(seed), q('sub', [2, 1], 1), 1, 3);
      expect(d).toHaveLength(3);
      expect(new Set(d.map((x) => x.text)).size).toBe(3);
    }
  });
});

describe('AC-15.1: a rule-based distractor whenever a rule applies', () => {
  for (const d of [1, 2, 3, 4] as MathRallyDifficulty[]) {
    for (const { kind } of KINDS_V1[d]) {
      it(`difficulty ${d} ${kind}`, () => {
        const rng = createRng(17 + d);
        const paths = d === 1 ? 2 : d === 2 ? 3 : 4;
        for (let i = 0; i < 1000; i++) {
          const question = generateQuestionV1(rng, d, kind);
          const ds = buildDistractors(rng, question, d, paths - 1);
          expect(ds.some((x) => x.rule !== 'near')).toBe(true);
          expect(ds.some((x) => sameValue(parseOption(x.text)!, question.answer))).toBe(false);
        }
      });
    }
  }
  it('exactInt is reduced', () => {
    expect(exactInt(-4)).toEqual({ num: -4, den: 1 });
  });
});
