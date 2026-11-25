/** Quality profiles (G11), MR1 FD Section 5 and NFR design Section 4. */
export type QualityProfile = 'high' | 'low';

export interface QualitySettings {
  drawDistance: number;
  renderScale: number;
  /** Draw a roadside sprite every N segments. */
  spriteEvery: number;
  /** Skip sprites beyond this fraction of the draw distance (1 = never skip). */
  spriteCutoff: number;
  parallaxLayers: number;
  particles: boolean;
}

export const QUALITY: Readonly<Record<QualityProfile, Readonly<QualitySettings>>> = Object.freeze({
  high: Object.freeze({ drawDistance: 300, renderScale: 1, spriteEvery: 1, spriteCutoff: 1, parallaxLayers: 3, particles: true }),
  low: Object.freeze({ drawDistance: 150, renderScale: 0.75, spriteEvery: 2, spriteCutoff: 0.6, parallaxLayers: 1, particles: false }),
});

export const MIN_SAMPLES = 120;
export const MAX_MEDIAN_FRAME_MS = 20;
export const QUALITY_STORAGE_KEY = 'mathRally.quality';

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** 'low' once 'high' has at least 120 samples with a median above 20 ms; never back to 'high'. */
export function chooseProfile(current: QualityProfile, frameTimesMs: readonly number[]): QualityProfile {
  if (current === 'low') return 'low';
  if (frameTimesMs.length < MIN_SAMPLES) return 'high';
  return median(frameTimesMs) > MAX_MEDIAN_FRAME_MS ? 'low' : 'high';
}

/** Storage adapter; any storage error means "nothing stored". */
export interface ProfileStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadStartProfile(store: ProfileStore | null | undefined): QualityProfile {
  try {
    return store?.getItem(QUALITY_STORAGE_KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

export function rememberLowProfile(store: ProfileStore | null | undefined): void {
  try {
    store?.setItem(QUALITY_STORAGE_KEY, 'low');
  } catch {
    /* storage unavailable: the next race starts on high again */
  }
}
