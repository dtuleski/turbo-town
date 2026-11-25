import type { ForkOutcome } from '../core/forkController';
import type { QualityProfile } from '../core/quality';

/** State the race scene publishes for the HUD each frame (no allocation: one shared object). */
export interface RaceView {
  phase: 'countdown' | 'running' | 'paused' | 'finished';
  countdown: number;
  fork: number;
  forks: number;
  coins: number;
  timeMs: number;
  question: string | null;
  options: readonly string[];
  lane: number;
  paths: number;
  lastOutcome: (ForkOutcome & { correctText: string }) | null;
  outcomeUntilMs: number;
  profile: QualityProfile;
  touchSeen: boolean;
}

export function createRaceView(forks: number, paths: number): RaceView {
  return {
    phase: 'countdown',
    countdown: 3,
    fork: 0,
    forks,
    coins: 0,
    timeMs: 0,
    question: null,
    options: [],
    lane: 0,
    paths,
    lastOutcome: null,
    outcomeUntilMs: 0,
    profile: 'high',
    touchSeen: false,
  };
}

export const RACE_VIEW_KEY = 'mathRallyView';
export const RACE_EVENTS = {
  laneAction: 'mr-lane',
  togglePause: 'mr-pause',
} as const;
