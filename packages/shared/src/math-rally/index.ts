/**
 * Math Rally shared race core (MR2). Imports nothing outside this folder, so the web app
 * can use it through a funnel module and the Game Service can bundle it.
 */
export * from './types';
export {
  INTEGER_OPTION,
  FRACTION_OPTION,
  isCanonicalOption,
  parseOption,
  sameValue,
  formatExact,
} from './exact';
export { createRng } from './rng';
export type { Rng } from './rng';
export {
  MATH_RALLY_THEME_ID,
  MR_CLIENT_PROTOCOL,
  MR_SUPPORTED_PROTOCOLS,
  MATH_RALLY_UPDATE_REQUIRED_MESSAGE,
  protocolSpec,
} from './protocols';
export type { ProtocolSpec, KindWeight } from './protocols';
export { trackLayout } from './track';
export type { TrackLayout } from './track';
export { MAX_FRAME_MS, initialMotion, speedAt, advanceMotion, applyOutcome } from './motion';
export type { Motion } from './motion';
export { expectedRaceTimesMs, isPlausibleTiming } from './timing';
export { buildRace } from './race';
export { PROTOCOL_V1 } from './v1';
