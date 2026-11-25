import type { Rng } from './rng';
import { PROTOCOL_V1 } from './v1';
import type {
  DifficultyParams,
  GeneratedQuestion,
  MathRallyDifficulty,
  QuestionKind,
  TrackConstants,
} from './types';

export const MATH_RALLY_THEME_ID = 'MATH_RALLY';

/** Version this build of the game speaks; sent in `ready`. */
export const MR_CLIENT_PROTOCOL = 1;

/** Versions the Game Service builds and checks. Removing one is an owner decision (NFR-MK-23). */
export const MR_SUPPORTED_PROTOCOLS: readonly number[] = Object.freeze([1]);

export const MATH_RALLY_UPDATE_REQUIRED_MESSAGE = 'Please update the app to play.';

export interface KindWeight {
  kind: QuestionKind;
  weight: number;
}

export interface ProtocolSpec {
  version: number;
  params: Readonly<Record<MathRallyDifficulty, Readonly<DifficultyParams>>>;
  track: Readonly<TrackConstants>;
  kinds: Readonly<Record<MathRallyDifficulty, readonly KindWeight[]>>;
  generateQuestion(rng: Rng, difficulty: MathRallyDifficulty, kind: QuestionKind): GeneratedQuestion;
  /** Returns `paths` options with the correct one first. */
  buildOptions(rng: Rng, q: GeneratedQuestion, difficulty: MathRallyDifficulty, paths: number): string[];
}

/** One entry per version folder. A new version (v2/) is added here and to MR_SUPPORTED_PROTOCOLS. */
const registry: ReadonlyMap<number, Readonly<ProtocolSpec>> = new Map([[PROTOCOL_V1.version, PROTOCOL_V1]]);

/** The spec for a registered integer version; null for anything else. */
export function protocolSpec(version: unknown): Readonly<ProtocolSpec> | null {
  if (typeof version !== 'number' || !Number.isInteger(version)) return null;
  return registry.get(version) ?? null;
}
