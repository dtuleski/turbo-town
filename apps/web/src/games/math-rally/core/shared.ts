// Math Rally - shared race core funnel.
//
// The ONLY module in apps/web that names packages/shared/src/math-rally (same pattern as
// src/utils/questShared.ts). The shared module imports nothing outside its folder, so this pulls
// no zod or date-fns into the game chunk. Production builds include it only through the lazy
// Math Rally chunk.
export {
  MR_CLIENT_PROTOCOL,
  MATH_RALLY_UPDATE_REQUIRED_MESSAGE,
  protocolSpec,
  trackLayout,
  initialMotion,
  speedAt,
  advanceMotion,
  applyOutcome,
  MAX_FRAME_MS,
  isCanonicalOption,
  parseOption,
  sameValue,
  formatExact,
} from '../../../../../../packages/shared/src/math-rally';
export type {
  Motion,
  ProtocolSpec,
  TrackLayout,
  MathRallyDifficulty,
  MathRallyQuestion,
  MathRallyRacePayload,
  QuestionKind,
} from '../../../../../../packages/shared/src/math-rally';
