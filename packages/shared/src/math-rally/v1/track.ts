import type { MathRallyDifficulty, TrackConstants } from '../types';
import { PARAMS_V1 } from './params';

const SEGMENT = 200;
const MAX_SPEED = 3750;

/** readSeconds x maxSpeed, rounded up to whole segments (MR2 FD, owner answer Q1). */
function approach(d: MathRallyDifficulty): number {
  return Math.ceil((PARAMS_V1[d].readSeconds * MAX_SPEED) / SEGMENT) * SEGMENT;
}

/** Track constants of protocol v1 (MR2 functional design, domain-entities Section 3.3). */
export const TRACK_V1: Readonly<TrackConstants> = Object.freeze({
  segmentLength: SEGMENT,
  accel: 1500,
  cruiseSpeed: 3000,
  maxSpeed: MAX_SPEED,
  slowFactor: 0.6,
  boostSeconds: 1,
  slowSeconds: 1.5,
  firstQuestionAt: 600,
  approachLength: Object.freeze({ 1: approach(1), 2: approach(2), 3: approach(3), 4: approach(4) }),
  branchLength: 4000,
  gapLength: 2000,
  mergeToNextQuestion: 200,
  finishLength: 9000,
  // AC-30.2 property test: 0 ms suffices for all four difficulties (3 x 1000 races each); +50 ms margin (MR2 Step 6).
  timingToleranceMs: 50,
});
