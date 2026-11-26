import type { FrameSample } from '../phaser/context';

/**
 * Frame recorder for the gate (G17, dev and gate builds only). Pre-allocated ring buffer
 * (no allocation per frame); statistics and CSV only on demand (NFR design Section 3).
 */
export const FRAME_CAPACITY = 20000;
export const LATENCY_CAPACITY = 512;
const EVENTS = ['', 'decision', 'merge', 'finish', 'profileLow'] as const;

export interface FrameStats {
  frames: number;
  medianFps: number;
  onePercentLowFps: number;
  p99FrameMs: number;
}

export interface FrameRecorder {
  record(s: FrameSample): void;
  count(): number;
  stats(): FrameStats;
  toCsv(meta: { device: string; compositionMode: string; run: number; guardReports: number }): string;
  reset(): void;
}

export function percentile(sorted: Float64Array | number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] as number;
}

export function createFrameRecorder(capacity = FRAME_CAPACITY): FrameRecorder {
  const raf = new Float64Array(capacity);
  const clock = new Int32Array(capacity);
  const fork = new Int16Array(capacity);
  const low = new Uint8Array(capacity);
  const ev = new Uint8Array(capacity);
  let n = 0;
  // Lane-change input latencies (P-2); a race has a few dozen.
  const latency = new Float64Array(LATENCY_CAPACITY);
  let nl = 0;

  function frameTimes(): Float64Array {
    const out = new Float64Array(Math.max(0, n - 1));
    for (let i = 1; i < n; i++) out[i - 1] = (raf[i] as number) - (raf[i - 1] as number);
    return out;
  }

  return {
    record(s) {
      if (s.inputLatencyMs !== undefined && nl < LATENCY_CAPACITY) latency[nl++] = s.inputLatencyMs;
      if (n >= capacity) return;
      raf[n] = s.rafMs;
      clock[n] = s.clockMs;
      fork[n] = s.fork;
      low[n] = s.profile === 'low' ? 1 : 0;
      ev[n] = Math.max(0, EVENTS.indexOf(s.event));
      n++;
    },
    count: () => n,
    stats() {
      const dt = frameTimes().sort();
      const med = percentile(dt, 50);
      const p99 = percentile(dt, 99);
      return {
        frames: n,
        medianFps: med > 0 ? 1000 / med : 0,
        onePercentLowFps: p99 > 0 ? 1000 / p99 : 0,
        p99FrameMs: p99,
      };
    },
    toCsv(meta) {
      const rows = ['frame,rafMs,clockMs,frameMs,profile,fork,event'];
      for (let i = 0; i < n; i++) {
        const frameMs = i === 0 ? '' : ((raf[i] as number) - (raf[i - 1] as number)).toFixed(3);
        rows.push(`${i},${(raf[i] as number).toFixed(3)},${clock[i]},${frameMs},${low[i] ? 'low' : 'high'},${fork[i]},${EVENTS[ev[i] as number]}`);
      }
      const st = this.stats();
      rows.push('');
      rows.push(`# device,${meta.device.replace(/[\r\n,]/g, ' ')}`);
      rows.push(`# compositionMode,${meta.compositionMode}`);
      rows.push(`# run,${meta.run}`);
      rows.push(`# medianFps,${st.medianFps.toFixed(2)}`);
      rows.push(`# onePercentLowFps,${st.onePercentLowFps.toFixed(2)}`);
      rows.push(`# frames,${st.frames}`);
      rows.push(`# guardReports,${meta.guardReports}`);
      const lat = Array.from(latency.subarray(0, nl));
      const latSorted = lat.slice().sort((a, b) => a - b);
      rows.push(`# inputLatencyCount,${nl}`);
      rows.push(`# inputLatencyMedianMs,${percentile(latSorted, 50).toFixed(1)}`);
      rows.push(`# inputLatencyMaxMs,${(latSorted[latSorted.length - 1] ?? 0).toFixed(1)}`);
      rows.push(`# inputLatencyMs,${lat.map((x) => x.toFixed(1)).join(' ')}`);
      return rows.join('\n') + '\n';
    },
    reset() {
      n = 0;
      nl = 0;
    },
  };
}

/** Gate pass rule (FD business-rules G-4). */
export function runPasses(s: FrameStats): boolean {
  return s.medianFps >= 50 && s.onePercentLowFps >= 30;
}
