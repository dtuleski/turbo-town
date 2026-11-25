import fc from 'fast-check';
import { formatExact, isCanonicalOption, parseOption, sameValue } from './exact';
import { createRng } from './rng';
import type { MathRallyDifficulty } from './types';
import { buildOptionsV1 } from './v1/distractors';
import { KINDS_V1, generateQuestionV1 } from './v1/questions';

const PATHS: Record<MathRallyDifficulty, number> = { 1: 2, 2: 3, 3: 4, 4: 4 };

describe.each([1, 2, 3, 4] as const)('buildOptionsV1, difficulty %i', (d) => {
  it('options are canonical, distinct by value, with the correct one first (FR-MK-14, FR-MK-15)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), fc.constantFrom(...KINDS_V1[d].map((k) => k.kind)), (s, kind) => {
        const rng = createRng(s);
        const q = generateQuestionV1(rng, d, kind);
        const opts = buildOptionsV1(rng, q, d, PATHS[d]);
        expect(opts).toHaveLength(PATHS[d]);
        expect(opts[0]).toBe(formatExact(q.answer));
        const vals = opts.map((o) => {
          expect(isCanonicalOption(o)).toBe(true);
          return parseOption(o)!;
        });
        expect(vals.filter((v) => sameValue(v, q.answer))).toHaveLength(1);
        for (let i = 0; i < vals.length; i++) {
          for (let j = i + 1; j < vals.length; j++) expect(sameValue(vals[i]!, vals[j]!)).toBe(false);
        }
      }),
      { numRuns: 1000, seed: 7 * d }
    );
  });
});
