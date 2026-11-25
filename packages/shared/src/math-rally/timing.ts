import { applyOutcome, initialMotion, timeToReach } from './motion';
import type { Motion } from './motion';
import { protocolSpec } from './protocols';
import { trackLayout } from './track';
import type { MathRallyDifficulty } from './types';

/**
 * Expected crossing times in closed form (no frame loop): each line is crossed at its exact
 * time and each window opens at that time. Values are Math.floor of the exact milliseconds.
 * Null for an unknown version or a wrong-length answer list.
 */
export function expectedRaceTimesMs(
  version: number,
  difficulty: MathRallyDifficulty,
  correct: readonly boolean[]
): { forkTimesMs: number[]; finishMs: number } | null {
  const spec = protocolSpec(version);
  if (!spec) return null;
  const params = spec.params[difficulty];
  if (!params || correct.length !== params.forks) return null;
  const track = spec.track;
  const layout = trackLayout(spec, difficulty);
  let m: Motion = initialMotion();
  const forkTimesMs: number[] = [];
  for (let k = 0; k < params.forks; k++) {
    const line = layout.decisionLine[k] as number;
    const t = timeToReach(m, line, track);
    m = { ...m, kinMs: t, position: line };
    forkTimesMs.push(Math.floor(t));
    m = applyOutcome(m, correct[k] as boolean, track);
  }
  const finish = timeToReach(m, layout.finishLine, track);
  return { forkTimesMs, finishMs: Math.floor(finish) };
}

/**
 * True iff every submitted fork time and the completion time are at or after the
 * expected time minus the tolerance (an honest kart is never early, see the frame rule).
 */
export function isPlausibleTiming(
  sub: { forkTimesMs: readonly number[]; completionTimeMs: number },
  expected: { forkTimesMs: readonly number[]; finishMs: number },
  toleranceMs: number
): boolean {
  if (sub.forkTimesMs.length !== expected.forkTimesMs.length) return false;
  for (let k = 0; k < expected.forkTimesMs.length; k++) {
    const got = sub.forkTimesMs[k];
    if (typeof got !== 'number' || !Number.isFinite(got)) return false;
    if (got < (expected.forkTimesMs[k] as number) - toleranceMs) return false;
  }
  return Number.isFinite(sub.completionTimeMs) && sub.completionTimeMs >= expected.finishMs - toleranceMs;
}
