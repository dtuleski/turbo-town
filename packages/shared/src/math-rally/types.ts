/**
 * Math Rally shared types (S6). Shapes follow
 * aidlc-docs/inception/application-design/math-rally-component-methods.md Section 1,
 * with the per-difficulty approach length of the MR2 functional design.
 */

export type MathRallyDifficulty = 1 | 2 | 3 | 4;

export const MATH_RALLY_DIFFICULTIES: readonly MathRallyDifficulty[] = Object.freeze([1, 2, 3, 4] as const);

export type QuestionKind =
  | 'add'
  | 'sub' // difficulty 1 and 2
  | 'mul'
  | 'div' // difficulty 2
  | 'twoStep'
  | 'fractionOf'
  | 'percentOf'
  | 'square' // difficulty 3
  | 'negArith'
  | 'fracAdd'
  | 'percentOfAny'
  | 'power'
  | 'sqrt'
  | 'equation'; // difficulty 4

/** An exact rational value: den > 0, gcd(|num|, den) === 1, den === 1 for whole numbers. */
export interface Exact {
  num: number;
  den: number;
}

export interface MathRallyQuestion {
  kind: QuestionKind;
  /** Integers, |value| <= 1000, at most 4; slot meaning fixed per kind and protocol version. */
  operands: readonly number[];
  /** `paths` canonical strings, pairwise distinct by value. */
  options: readonly string[];
  /** 0 .. paths - 1 */
  correctIndex: number;
}

export interface MathRallyRacePayload {
  protocolVersion: number;
  difficulty: MathRallyDifficulty;
  forks: number;
  paths: 2 | 3 | 4;
  readSeconds: number;
  questions: readonly MathRallyQuestion[];
}

export interface MathRallyGameRecord {
  seed: number;
  protocolVersion: number;
  paths: number;
  forks: number;
  /** correctIndex per fork */
  key: readonly number[];
}

export interface MathRallySubmission {
  choices: readonly number[];
  forkTimesMs: readonly number[];
}

export interface DifficultyParams {
  paths: 2 | 3 | 4;
  forks: number;
  readSeconds: number;
}

export interface TrackConstants {
  /** World units per road segment. */
  segmentLength: number;
  /** Units/s^2 from "Go" up to cruise. */
  accel: number;
  /** Units/s. */
  cruiseSpeed: number;
  /** Boost speed, units/s. */
  maxSpeed: number;
  /** Wrong-branch speed = slowFactor x cruiseSpeed. */
  slowFactor: number;
  boostSeconds: number;
  slowSeconds: number;
  /** Position of the first question after "Go". */
  firstQuestionAt: number;
  /** Question start to decision line, per difficulty. */
  approachLength: Readonly<Record<MathRallyDifficulty, number>>;
  branchLength: number;
  gapLength: number;
  /** Merge end to the next question start. */
  mergeToNextQuestion: number;
  /** Last merge end to the finish line. */
  finishLength: number;
  /** Set by the AC-30.2 property test (at most 250 ms). */
  timingToleranceMs: number;
}

export interface GeneratedQuestion {
  kind: QuestionKind;
  operands: number[];
  answer: Exact;
}

export interface MathRallyRace {
  payload: MathRallyRacePayload;
  record: MathRallyGameRecord;
}
