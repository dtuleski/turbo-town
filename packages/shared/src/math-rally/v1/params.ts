import type { DifficultyParams, MathRallyDifficulty } from '../types';

/** Requirements Section 4.0, protocol v1. Frozen after launch (PL8). */
export const PARAMS_V1: Readonly<Record<MathRallyDifficulty, Readonly<DifficultyParams>>> = Object.freeze({
  1: Object.freeze({ paths: 2, forks: 10, readSeconds: 8 }),
  2: Object.freeze({ paths: 3, forks: 12, readSeconds: 7 }),
  3: Object.freeze({ paths: 4, forks: 15, readSeconds: 6 }),
  4: Object.freeze({ paths: 4, forks: 15, readSeconds: 5 }),
} as const);
