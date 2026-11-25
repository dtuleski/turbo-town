import type { GameErrorCode, GameErrorMessage } from '../core/fatalErrorGuard';
import { MR_CLIENT_PROTOCOL, isCanonicalOption, parseOption, protocolSpec, sameValue } from '../core/shared';
import type { MathRallyDifficulty, MathRallyRacePayload } from '../core/shared';

/** Bridge messages (methods file Section 4). MR1 implements the subset the slice and spike use. */
export interface ReadyMessage {
  v: 1;
  type: 'ready';
  protocolVersion: number;
  buildId: string;
}
export interface RaceFinishedMessage {
  v: 1;
  type: 'raceFinished';
  choices: number[];
  forkTimesMs: number[];
  raceTimeMs: number;
  correctCount: number;
}
export interface PauseChangedMessage {
  v: 1;
  type: 'pauseChanged';
  paused: boolean;
  sound: boolean;
}
export interface ExitRequestedMessage {
  v: 1;
  type: 'exitRequested';
}
export type GameToHost = ReadyMessage | RaceFinishedMessage | PauseChangedMessage | ExitRequestedMessage | GameErrorMessage;

export interface InitMessage {
  v: 1;
  type: 'init';
  mode: 'scored' | 'offline';
  difficulty: MathRallyDifficulty;
  language: 'en' | 'es' | 'pt';
  sound: boolean;
  reducedMotion: boolean;
  touchUi: boolean;
  race?: MathRallyRacePayload;
  seed?: number;
}
export type HostToGame = InitMessage | { v: 1; type: 'pause' } | { v: 1; type: 'resume' } | { v: 1; type: 'setSound'; sound: boolean };

export type { GameErrorCode };

const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);

/** Race payload validation inside the game before the countdown; null means INIT_INVALID. */
export function validateRacePayload(value: unknown, difficulty: MathRallyDifficulty): MathRallyRacePayload | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  const spec = protocolSpec(MR_CLIENT_PROTOCOL);
  if (!spec || r.protocolVersion !== MR_CLIENT_PROTOCOL || r.difficulty !== difficulty) return null;
  const p = spec.params[difficulty];
  if (!p || r.forks !== p.forks || r.paths !== p.paths || r.readSeconds !== p.readSeconds) return null;
  const kinds = new Set(spec.kinds[difficulty].map((k) => k.kind));
  if (!Array.isArray(r.questions) || r.questions.length !== p.forks) return null;
  for (const q of r.questions as unknown[]) {
    if (!q || typeof q !== 'object') return null;
    const { kind, operands, options, correctIndex } = q as Record<string, unknown>;
    if (typeof kind !== 'string' || !kinds.has(kind as never)) return null;
    if (!Array.isArray(operands) || operands.length > 4 || !operands.every((o) => isInt(o) && Math.abs(o) <= 1000)) return null;
    if (!Array.isArray(options) || options.length !== p.paths) return null;
    const vals = [];
    for (const o of options) {
      if (typeof o !== 'string' || !isCanonicalOption(o)) return null;
      vals.push(parseOption(o)!);
    }
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) if (sameValue(vals[i]!, vals[j]!)) return null;
    if (!isInt(correctIndex) || correctIndex < 0 || correctIndex >= p.paths) return null;
  }
  return value as MathRallyRacePayload;
}
