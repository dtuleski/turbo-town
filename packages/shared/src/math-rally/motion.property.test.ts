import fc from 'fast-check';
import { MAX_FRAME_MS, advanceMotion, applyOutcome, initialMotion } from './motion';
import type { Motion } from './motion';
import { protocolSpec } from './protocols';
import { expectedRaceTimesMs, isPlausibleTiming } from './timing';
import { trackLayout } from './track';
import { MATH_RALLY_DIFFICULTIES } from './types';
import type { MathRallyDifficulty } from './types';

/**
 * AC-30.2: a frame-by-frame race (frame rule of the methods file Section 1) is never
 * earlier than the closed-form expected times minus the tolerance.
 */

const spec = protocolSpec(1)!;
const track = spec.track;

interface Recorded {
  forkTimesMs: number[];
  completionTimeMs: number;
  maxSpeedSeen: number;
}

/** Frame harness: real frame deltas, a clock that excludes pauses, dt clamped to 50 ms. */
export function simulateRace(
  difficulty: MathRallyDifficulty,
  answers: readonly boolean[],
  frameDeltas: readonly number[],
  pauses: ReadonlyMap<number, number>
): Recorded {
  const layout = trackLayout(spec, difficulty);
  let m: Motion = initialMotion();
  let clock = 0;
  let lastElapsed = 0;
  let fork = 0;
  const forkTimesMs: number[] = [];
  let maxSpeedSeen = 0;
  for (let i = 0; ; i++) {
    const real = frameDeltas[i % frameDeltas.length] as number;
    const paused = pauses.get(i) ?? 0; // paused time inside this frame interval is not counted
    clock += Math.max(0, real - paused);
    const dt = Math.min(Math.max(clock - lastElapsed, 0), MAX_FRAME_MS);
    lastElapsed = clock;
    const before = m.position;
    m = advanceMotion(m, dt, track);
    if (dt > 0) maxSpeedSeen = Math.max(maxSpeedSeen, ((m.position - before) / dt) * 1000);
    if (fork < answers.length && m.position >= (layout.decisionLine[fork] as number)) {
      forkTimesMs.push(clock);
      m = applyOutcome(m, answers[fork] as boolean, track);
      fork++;
    }
    if (fork === answers.length && m.position >= layout.finishLine) {
      return { forkTimesMs, completionTimeMs: clock, maxSpeedSeen };
    }
    if (i > 2_000_000) throw new Error('race did not finish');
  }
}

const frameDelta = fc.oneof(
  { weight: 9, arbitrary: fc.integer({ min: 1, max: 50 }) },
  { weight: 1, arbitrary: fc.integer({ min: 51, max: 500 }) }
);

export function raceArbitrary(difficulty: MathRallyDifficulty) {
  const forks = spec.params[difficulty].forks;
  return fc.record({
    answers: fc.array(fc.boolean(), { minLength: forks, maxLength: forks }),
    deltas: fc.array(frameDelta, { minLength: 20, maxLength: 200 }),
    pauses: fc.array(fc.tuple(fc.integer({ min: 0, max: 5000 }), fc.integer({ min: 1, max: 60000 })), { maxLength: 3 }),
  });
}

/** Smallest tolerance the property needs is found by Step 6 of the code generation plan. */
export function holdsWithTolerance(difficulty: MathRallyDifficulty, toleranceMs: number, runs: number, seed = 1): boolean {
  const result = fc.check(
    fc.property(raceArbitrary(difficulty), ({ answers, deltas, pauses }) => {
      const recorded = simulateRace(difficulty, answers, deltas, new Map(pauses));
      const expected = expectedRaceTimesMs(1, difficulty, answers)!;
      return isPlausibleTiming(recorded, expected, toleranceMs);
    }),
    { numRuns: runs, seed }
  );
  return !result.failed;
}

describe.each(MATH_RALLY_DIFFICULTIES.map((d) => [d]))('frame-loop timing, difficulty %i (AC-30.2)', (d) => {
  it('is never early by more than timingToleranceMs over 1000 races', () => {
    fc.assert(
      fc.property(raceArbitrary(d), ({ answers, deltas, pauses }) => {
        const recorded = simulateRace(d, answers, deltas, new Map(pauses));
        const expected = expectedRaceTimesMs(1, d, answers)!;
        expect(isPlausibleTiming(recorded, expected, track.timingToleranceMs)).toBe(true);
        // Speed never above maximum.
        expect(recorded.maxSpeedSeen).toBeLessThanOrEqual(track.maxSpeed + 1e-6);
      }),
      { numRuns: 1000, seed: 20261125 + d }
    );
  });
});
