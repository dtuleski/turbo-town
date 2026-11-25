import type { ProtocolSpec } from '../protocols';
import { buildOptionsV1 } from './distractors';
import { PARAMS_V1 } from './params';
import { KINDS_V1, generateQuestionV1 } from './questions';
import { TRACK_V1 } from './track';

/**
 * Math Rally protocol v1. Before launch everything here may be tuned; from the launch
 * commit on (PL8), nothing reachable from PROTOCOL_V1 may change behaviour: a change ships as v2/.
 */
export const PROTOCOL_V1: Readonly<ProtocolSpec> = Object.freeze({
  version: 1,
  params: PARAMS_V1,
  track: TRACK_V1,
  kinds: KINDS_V1,
  generateQuestion: generateQuestionV1,
  buildOptions: buildOptionsV1,
});
