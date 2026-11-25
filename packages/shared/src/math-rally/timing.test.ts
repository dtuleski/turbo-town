import { advanceMotion, applyOutcome, initialMotion, speedAt } from './motion';
import { protocolSpec } from './protocols';
import { expectedRaceTimesMs, isPlausibleTiming } from './timing';

const spec = protocolSpec(1)!;
const track = spec.track;

describe('motion', () => {
  it('accelerates to cruise in 2 s over 3000 units', () => {
    let m = initialMotion();
    for (let i = 0; i < 40; i++) m = advanceMotion(m, 50, track);
    expect(m.kinMs).toBe(2000);
    expect(m.position).toBeCloseTo(3000, 6);
    expect(speedAt(m, 2000, track)).toBe(3000);
  });

  it('integrates exactly across the end of acceleration inside one frame', () => {
    let m = { ...initialMotion(), kinMs: 1980, position: (1500 * 1.98 * 1.98) / 2 };
    m = advanceMotion(m, 50, track); // 20 ms accelerating, 30 ms at cruise
    expect(m.position).toBeCloseTo(3000 + 3000 * 0.03, 6);
  });

  it('boost and slowdown windows', () => {
    let m = { ...initialMotion(), kinMs: 5000, position: 10000 };
    m = applyOutcome(m, true, track);
    expect(speedAt(m, 5500, track)).toBe(3750);
    expect(speedAt(m, 6000, track)).toBe(3000);
    m = applyOutcome({ ...m, kinMs: 5200 }, false, track);
    expect(speedAt(m, 5300, track)).toBe(1800); // slowdown closes the boost
    expect(m.boostUntilMs).toBe(5200);
  });

  it('refuses frames longer than 50 ms', () => {
    expect(() => advanceMotion(initialMotion(), 51, track)).toThrow(RangeError);
    expect(() => advanceMotion(initialMotion(), -1, track)).toThrow(RangeError);
  });
});

describe('expectedRaceTimesMs', () => {
  it('Easy all correct takes about 122.3 s (functional design Section 4)', () => {
    const r = expectedRaceTimesMs(1, 1, Array(10).fill(true))!;
    expect(r.forkTimesMs[0]).toBe(11200);
    expect(r.forkTimesMs[1]! - r.forkTimesMs[0]!).toBeGreaterThanOrEqual(11816);
    expect(r.forkTimesMs[1]! - r.forkTimesMs[0]!).toBeLessThanOrEqual(11817);
    expect(r.finishMs).toBeGreaterThanOrEqual(122299);
    expect(r.finishMs).toBeLessThanOrEqual(122301);
  });

  it('wrong answers make the race longer than right answers', () => {
    const right = expectedRaceTimesMs(1, 3, Array(15).fill(true))!;
    const wrong = expectedRaceTimesMs(1, 3, Array(15).fill(false))!;
    expect(wrong.finishMs).toBeGreaterThan(right.finishMs);
    // per fork: a slowdown costs 0.6 s against cruise, a boost saves 0.25 s
    expect(wrong.finishMs - right.finishMs).toBeGreaterThan(15 * 800);
  });

  it('returns null for an unknown version or a wrong-length list', () => {
    expect(expectedRaceTimesMs(2, 1, Array(10).fill(true))).toBeNull();
    expect(expectedRaceTimesMs(1, 1, Array(9).fill(true))).toBeNull();
  });
});

describe('isPlausibleTiming', () => {
  const expected = { forkTimesMs: [1000, 2000], finishMs: 3000 };
  it('accepts at or after the floor', () => {
    expect(isPlausibleTiming({ forkTimesMs: [1000, 2000], completionTimeMs: 3000 }, expected, 0)).toBe(true);
    expect(isPlausibleTiming({ forkTimesMs: [950, 1950], completionTimeMs: 2950 }, expected, 50)).toBe(true);
  });
  it('refuses early times, wrong lengths and non-numbers', () => {
    expect(isPlausibleTiming({ forkTimesMs: [949, 2000], completionTimeMs: 3000 }, expected, 50)).toBe(false);
    expect(isPlausibleTiming({ forkTimesMs: [1000, 2000], completionTimeMs: 2949 }, expected, 50)).toBe(false);
    expect(isPlausibleTiming({ forkTimesMs: [1000], completionTimeMs: 3000 }, expected, 50)).toBe(false);
    expect(isPlausibleTiming({ forkTimesMs: [1000, NaN], completionTimeMs: 3000 }, expected, 50)).toBe(false);
  });
});
