import type { HostChannel } from '../bridge/hostChannel';
import type { InitMessage } from '../bridge/protocol';
import type { FatalErrorGuard } from '../core/fatalErrorGuard';
import type { QualityProfile } from '../core/quality';
import type { MathRallyRacePayload } from '../core/shared';

/** Per-frame sample for the dev frame overlay (G17). */
export interface FrameSample {
  rafMs: number;
  clockMs: number;
  profile: QualityProfile;
  fork: number;
  event: '' | 'decision' | 'merge' | 'finish' | 'profileLow';
  /**
   * Input to screen for a lane change finished since the last sample (P-2, gate builds): from the
   * input event's timestamp to the first frame after the one that drew the lean (display time).
   */
  inputLatencyMs?: number;
}

/** Everything the scenes share for one mount. */
export interface RaceContext {
  channel: HostChannel;
  guard: FatalErrorGuard;
  assetBaseUrl: string;
  buildId: string;
  init?: InitMessage;
  race?: MathRallyRacePayload;
  sound: boolean;
  /** Live region text for screen readers (the host owns the DOM element). */
  announce: (text: string) => void;
  onFrame?: (sample: FrameSample) => void;
  devFaults: boolean;
  storage: Storage | null;
  /** Sets the canvas render scale (quality profile). */
  setRenderScale?: (factor: number) => void;
}

export const CONTEXT_KEY = 'mathRallyContext';
