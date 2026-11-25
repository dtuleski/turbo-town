import fc from 'fast-check';
import { formatExact, isCanonicalOption, parseOption, sameValue } from './exact';
import { protocolSpec } from './protocols';
import { buildRace, promptKey } from './race';
import { MATH_RALLY_DIFFICULTIES } from './types';
import type { MathRallyDifficulty } from './types';
import { KINDS_V1, generateQuestionV1 } from './v1/questions';
import { createRng } from './rng';

const seed = fc.integer({ min: 0, max: 0xffffffff });

describe.each(MATH_RALLY_DIFFICULTIES.map((d) => [d]))('buildRace v1, difficulty %i', (d: MathRallyDifficulty) => {
  const params = protocolSpec(1)!.params[d];
  const kinds = new Set(KINDS_V1[d].map((k) => k.kind));

  it('is deterministic and does not use Math.random or Date', () => {
    const random = jest.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random used');
    });
    const now = jest.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Date.now used');
    });
    try {
      fc.assert(fc.property(seed, (s) => expect(buildRace(s, d, 1)).toEqual(buildRace(s, d, 1))), { numRuns: 200 });
    } finally {
      random.mockRestore();
      now.mockRestore();
    }
  });

  it('meets the race contracts for 1000 seeds (AC-13.1, AC-14.1, AC-15.2, FR-MK-17)', () => {
    fc.assert(
      fc.property(seed, (s) => {
        const { payload, record } = buildRace(s, d, 1);
        expect(payload.protocolVersion).toBe(1);
        expect(record.protocolVersion).toBe(1);
        expect(payload.questions).toHaveLength(params.forks);
        expect(new Set(payload.questions.map(promptKey)).size).toBe(params.forks);
        expect(record.key).toEqual(payload.questions.map((q) => q.correctIndex));
        for (const q of payload.questions) {
          expect(kinds.has(q.kind)).toBe(true);
          expect(q.options).toHaveLength(params.paths);
          const vals = q.options.map((o) => {
            expect(isCanonicalOption(o)).toBe(true);
            expect(o).not.toMatch(/\./);
            return parseOption(o)!;
          });
          for (let i = 0; i < vals.length; i++) {
            for (let j = i + 1; j < vals.length; j++) expect(sameValue(vals[i]!, vals[j]!)).toBe(false);
            if (d < 4) expect(vals[i]!.num).toBeGreaterThanOrEqual(0);
          }
          // The correct option is written as formatExact(answer) (lowest terms, integer when whole).
          const correct = vals[q.correctIndex]!;
          expect(q.options[q.correctIndex]).toBe(formatExact(correct));
        }
      }),
      { numRuns: 1000, seed: 42 + d }
    );
  });

  it('balances the correct position and never repeats it 4 times in a row (AC-16.1)', () => {
    const counts = Array(params.paths).fill(0);
    let total = 0;
    for (let s = 0; total < 10000; s++) {
      const positions = buildRace(s, d, 1).payload.questions.map((q) => q.correctIndex);
      for (let i = 3; i < positions.length; i++) {
        expect(positions.slice(i - 3, i + 1).every((p) => p === positions[i])).toBe(false);
      }
      for (const p of positions) counts[p]++;
      total += positions.length;
    }
    for (const c of counts) expect(Math.abs((100 * c) / total - 100 / params.paths)).toBeLessThan(2);
  });
});

describe('buildRace errors', () => {
  it('throws RangeError for an unregistered version', () => {
    expect(() => buildRace(1, 1, 2)).toThrow(RangeError);
  });
  it('correct answer matches the generator for the same draws', () => {
    // The first question of seed 7 at Easy is the generator's first draw after the kind pick.
    const race = buildRace(7, 1, 1).payload.questions[0]!;
    const rng = createRng(7);
    const kind = rng.weightedPick(KINDS_V1[1].map((k) => ({ value: k.kind, weight: k.weight })));
    const g = generateQuestionV1(rng, 1, kind);
    expect(race.kind).toBe(g.kind);
    expect(race.options[race.correctIndex]).toBe(formatExact(g.answer));
  });
});
