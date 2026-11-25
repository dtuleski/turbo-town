import { MAX_FRAME_MS, advanceMotion, applyOutcome, initialMotion, trackLayout } from './shared';
import type { MathRallyDifficulty, Motion, ProtocolSpec, TrackLayout } from './shared';

export type TrackEvent =
  | { type: 'questionStart' | 'decisionLine' | 'merge'; fork: number; atMs: number }
  | { type: 'finish'; atMs: number };

export interface TrackRuntime {
  /** dt from the clock reading, clamped to [0, 50]. Never uses the engine's frame delta. */
  frame(clockElapsedMs: number): TrackEvent[];
  /** Called by the fork controller in the frame of the decisionLine event. */
  applyOutcome(correct: boolean): void;
  motion(): Motion;
  layout(): TrackLayout;
  finished(): boolean;
}

/** Track runtime (G5): applies the frame rule of the methods file Section 1. */
export function createTrackRuntime(spec: ProtocolSpec, difficulty: MathRallyDifficulty): TrackRuntime {
  const layout = trackLayout(spec, difficulty);
  const forks = layout.decisionLine.length;
  let m = initialMotion();
  let lastElapsed = 0;
  let nextQuestion = 0;
  let nextDecision = 0;
  let nextMerge = 0;
  let done = false;

  return {
    frame(clockElapsedMs) {
      if (done) return [];
      const dt = Math.min(Math.max(clockElapsedMs - lastElapsed, 0), MAX_FRAME_MS);
      lastElapsed = Math.max(lastElapsed, clockElapsedMs);
      m = advanceMotion(m, dt, spec.track);
      const events: TrackEvent[] = [];
      const at = clockElapsedMs;
      while (nextQuestion < forks && m.position >= (layout.questionStart[nextQuestion] as number)) {
        events.push({ type: 'questionStart', fork: nextQuestion++, atMs: at });
      }
      while (nextDecision < forks && m.position >= (layout.decisionLine[nextDecision] as number)) {
        events.push({ type: 'decisionLine', fork: nextDecision++, atMs: at });
      }
      while (nextMerge < forks && m.position >= (layout.mergeEnd[nextMerge] as number)) {
        events.push({ type: 'merge', fork: nextMerge++, atMs: at });
      }
      if (nextDecision === forks && m.position >= layout.finishLine) {
        done = true;
        events.push({ type: 'finish', atMs: at });
      }
      return events;
    },
    applyOutcome(correct) {
      m = applyOutcome(m, correct, spec.track);
    },
    motion: () => m,
    layout: () => layout,
    finished: () => done,
  };
}
