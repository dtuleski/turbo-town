import type { TrackConstants } from './types';

/**
 * Kart motion (S1, FR-MK-30). The game and the server use these same functions.
 * Time is kinematic time in ms since "Go" (race time with paused and clamped-away time removed).
 */
export interface Motion {
  kinMs: number;
  position: number;
  /** A boost window is open while kinMs < boostUntilMs. */
  boostUntilMs: number;
  /** A slowdown window is open while kinMs < slowUntilMs. */
  slowUntilMs: number;
}

export const MAX_FRAME_MS = 50;

export function initialMotion(): Motion {
  return { kinMs: 0, position: 0, boostUntilMs: 0, slowUntilMs: 0 };
}

export function accelEndMs(track: TrackConstants): number {
  return (track.cruiseSpeed / track.accel) * 1000;
}

/** Speed in units/s at kinematic time atKinMs. */
export function speedAt(m: Motion, atKinMs: number, track: TrackConstants): number {
  if (atKinMs < m.slowUntilMs) return track.slowFactor * track.cruiseSpeed;
  if (atKinMs < m.boostUntilMs) return track.maxSpeed;
  return Math.min(track.cruiseSpeed, (track.accel * atKinMs) / 1000);
}

/** Distance covered over [a, b] ms when no breakpoint lies strictly inside. */
function pieceDistance(m: Motion, a: number, b: number, track: TrackConstants): number {
  if (a < m.slowUntilMs || a < m.boostUntilMs) {
    return (speedAt(m, a, track) * (b - a)) / 1000;
  }
  if (b <= accelEndMs(track)) {
    return (track.accel * (b * b - a * a)) / 2 / 1e6;
  }
  return (track.cruiseSpeed * (b - a)) / 1000;
}

/** Breakpoints of the speed function after t: end of acceleration and window ends. */
export function breakpointsAfter(m: Motion, t: number, track: TrackConstants): number[] {
  return [accelEndMs(track), m.boostUntilMs, m.slowUntilMs].filter((x) => x > t).sort((x, y) => x - y);
}

/** Exact integration over [kinMs, kinMs + dtMs]. Precondition 0 <= dtMs <= 50. */
export function advanceMotion(m: Motion, dtMs: number, track: TrackConstants): Motion {
  if (!(dtMs >= 0 && dtMs <= MAX_FRAME_MS)) throw new RangeError(`dtMs ${dtMs} outside 0..${MAX_FRAME_MS}`);
  const end = m.kinMs + dtMs;
  let t = m.kinMs;
  let position = m.position;
  for (const bp of breakpointsAfter(m, t, track)) {
    if (bp >= end) break;
    position += pieceDistance(m, t, bp, track);
    t = bp;
  }
  position += pieceDistance(m, t, end, track);
  return { ...m, kinMs: end, position };
}

/** Opens a boost (correct) or slowdown (wrong) window at m.kinMs; closes the other one. */
export function applyOutcome(m: Motion, correct: boolean, track: TrackConstants): Motion {
  if (correct) {
    return { ...m, boostUntilMs: m.kinMs + track.boostSeconds * 1000, slowUntilMs: Math.min(m.slowUntilMs, m.kinMs) };
  }
  return { ...m, slowUntilMs: m.kinMs + track.slowSeconds * 1000, boostUntilMs: Math.min(m.boostUntilMs, m.kinMs) };
}

/**
 * Exact kinematic time at which the kart reaches `target`, from state m
 * (no window changes on the way). Used by the closed-form expected times.
 */
export function timeToReach(m: Motion, target: number, track: TrackConstants): number {
  let t = m.kinMs;
  let position = m.position;
  if (position >= target) return t;
  const pieces = [...breakpointsAfter(m, t, track), Infinity];
  for (const bp of pieces) {
    const inWindow = t < m.slowUntilMs || t < m.boostUntilMs;
    const accelerating = !inWindow && t < accelEndMs(track);
    const pieceEnd = bp;
    const distance = pieceEnd === Infinity ? Infinity : pieceDistance(m, t, pieceEnd, track);
    if (position + distance >= target) {
      const remaining = target - position;
      if (accelerating) {
        // accel/2 x (t'^2 - t^2) / 1e6 = remaining
        return Math.sqrt(t * t + (2e6 * remaining) / track.accel);
      }
      return t + (remaining / speedAt(m, t, track)) * 1000;
    }
    position += distance;
    t = pieceEnd;
  }
  return t;
}
