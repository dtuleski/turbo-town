import { describe, expect, it } from 'vitest';
import { createFrameRecorder, percentile, runPasses } from './frameOverlay';

describe('frame recorder (G17)', () => {
  it('computes median fps and 1% low from rAF timestamps', () => {
    const r = createFrameRecorder(1000);
    let t = 0;
    for (let i = 0; i < 500; i++) {
      t += i % 200 === 199 ? 40 : 16; // a slow 40 ms frame every 200 frames (0.4%)
      r.record({ rafMs: t, clockMs: Math.floor(t), profile: 'high', fork: 0, event: '' });
    }
    const s = r.stats();
    expect(s.frames).toBe(500);
    expect(s.medianFps).toBeCloseTo(62.5, 3);
    expect(s.p99FrameMs).toBe(16);
    expect(runPasses(s)).toBe(true);
  });

  it('fails the run when the slowest 1% drops below 30 fps', () => {
    const r = createFrameRecorder(1000);
    let t = 0;
    for (let i = 0; i < 500; i++) {
      t += i % 50 === 49 ? 45 : 16;
      r.record({ rafMs: t, clockMs: 0, profile: 'high', fork: 0, event: '' });
    }
    expect(runPasses(r.stats())).toBe(false);
  });

  it('writes a CSV with a summary and stops at capacity', () => {
    const r = createFrameRecorder(3);
    for (let i = 0; i < 5; i++) r.record({ rafMs: i * 16, clockMs: i * 16, profile: i > 1 ? 'low' : 'high', fork: 1, event: i === 2 ? 'profileLow' : '' });
    expect(r.count()).toBe(3);
    const csv = r.toCsv({ device: 'iPhone, test', compositionMode: 'n/a', run: 1, guardReports: 0 });
    expect(csv.split('\n')[0]).toBe('frame,rafMs,clockMs,frameMs,profile,fork,event');
    expect(csv).toContain('2,32.000,32,16.000,low,1,profileLow');
    expect(csv).toContain('# device,iPhone  test');
  });

  it('lists lane-change latencies in the CSV summary and clears them on reset', () => {
    const r = createFrameRecorder();
    r.record({ rafMs: 0, clockMs: 0, profile: 'high', fork: 0, event: '' });
    r.record({ rafMs: 16, clockMs: 16, profile: 'high', fork: 0, event: '', inputLatencyMs: 40 });
    r.record({ rafMs: 32, clockMs: 32, profile: 'high', fork: 0, event: '', inputLatencyMs: 25.25 });
    r.record({ rafMs: 48, clockMs: 48, profile: 'high', fork: 0, event: '', inputLatencyMs: 31 });
    const csv = r.toCsv({ device: 'd', compositionMode: 'n/a', run: 1, guardReports: 0 });
    expect(csv).toContain('# inputLatencyCount,3');
    expect(csv).toContain('# inputLatencyMedianMs,31.0');
    expect(csv).toContain('# inputLatencyMaxMs,40.0');
    expect(csv).toContain('# inputLatencyMs,40.0 25.3 31.0');
    r.reset();
    expect(r.toCsv({ device: 'd', compositionMode: 'n/a', run: 1, guardReports: 0 })).toContain('# inputLatencyCount,0');
  });

  it('percentile picks the nearest rank', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
    expect(percentile([1, 2, 3, 4], 99)).toBe(4);
    expect(percentile([], 50)).toBe(0);
  });
});
