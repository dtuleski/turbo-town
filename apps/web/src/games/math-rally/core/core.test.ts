import { describe, expect, it } from 'vitest';
import { createRaceClock } from './clock';
import { DEFAULT_JOYSTICK, JOYSTICK_IDLE, joystickStep, joystickVisible } from './joystick';
import { moveLane, resizeLanes } from './lanes';
import { branchCenter, branchFactor, cameraDepth, projectPoint } from './projection';
import { QUALITY_STORAGE_KEY, chooseProfile, loadStartProfile, median, rememberLowProfile } from './quality';
import { protocolSpec } from './shared';
import { createTrackRuntime } from './trackRuntime';

describe('race clock (G10)', () => {
  it('a 60 s pause adds 0 s (AC-5.1)', () => {
    const c = createRaceClock();
    c.start(1000);
    expect(c.elapsedMs(6000)).toBe(5000);
    c.pause(6000);
    expect(c.isRunning()).toBe(false);
    expect(c.elapsedMs(66000)).toBe(5000);
    c.resume(66000);
    expect(c.elapsedMs(67000)).toBe(6000);
  });

  it('floors to whole milliseconds and is 0 before start', () => {
    const c = createRaceClock();
    expect(c.elapsedMs(500)).toBe(0);
    c.start(0.4);
    expect(c.elapsedMs(10.9)).toBe(10);
  });
});

describe('lanes (G7)', () => {
  it('moves one lane and clamps', () => {
    expect(moveLane({ count: 3, lane: 0 }, 'left')).toEqual({ count: 3, lane: 0 });
    expect(moveLane({ count: 3, lane: 0 }, 'right')).toEqual({ count: 3, lane: 1 });
    expect(moveLane({ count: 3, lane: 2 }, 'right')).toEqual({ count: 3, lane: 2 });
  });
  it('keeps the nearest lane on resize', () => {
    expect(resizeLanes({ count: 4, lane: 3 }, 2)).toEqual({ count: 2, lane: 1 });
    expect(resizeLanes({ count: 2, lane: 0 }, 4)).toEqual({ count: 4, lane: 0 });
    expect(resizeLanes({ count: 1, lane: 0 }, 3).lane).toBe(1);
  });
});

describe('joystick (G8)', () => {
  it('one push past the threshold gives one action, holding repeats after the delay', () => {
    let s = { ...JOYSTICK_IDLE };
    let r = joystickStep(s, { dxRatio: 0.2, nowMs: 0 });
    expect(r.actions).toEqual([]);
    r = joystickStep(r.state, { dxRatio: 0.5, nowMs: 10 });
    expect(r.actions).toEqual(['right']);
    r = joystickStep(r.state, { dxRatio: 0.6, nowMs: 10 + DEFAULT_JOYSTICK.repeatDelayMs - 1 });
    expect(r.actions).toEqual([]);
    r = joystickStep(r.state, { dxRatio: 0.6, nowMs: 10 + DEFAULT_JOYSTICK.repeatDelayMs });
    expect(r.actions).toEqual(['right']);
    r = joystickStep(r.state, { dxRatio: -0.9, nowMs: 2000 });
    expect(r.actions).toEqual(['left']);
    s = joystickStep(r.state, { dxRatio: null, nowMs: 2001 }).state;
    expect(s).toEqual(JOYSTICK_IDLE);
  });
  it('is visible with touchUi or after the first touch', () => {
    expect(joystickVisible(false, false)).toBe(false);
    expect(joystickVisible(true, false)).toBe(true);
    expect(joystickVisible(false, true)).toBe(true);
  });
});

describe('quality (G11)', () => {
  const fast = Array(200).fill(16.7);
  const slow = Array(200).fill(25);
  it('drops to low after 120 slow samples and never returns', () => {
    expect(chooseProfile('high', slow.slice(0, 119))).toBe('high');
    expect(chooseProfile('high', slow.slice(0, 120))).toBe('low');
    expect(chooseProfile('high', fast)).toBe('high');
    expect(chooseProfile('low', fast)).toBe('low');
    expect(median([1, 3, 2, 4])).toBe(2.5);
  });
  it('remembers low on the device; storage errors mean high', () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(loadStartProfile(store)).toBe('high');
    rememberLowProfile(store);
    expect(data.get(QUALITY_STORAGE_KEY)).toBe('low');
    expect(loadStartProfile(store)).toBe('low');
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadStartProfile(broken)).toBe('high');
    expect(() => rememberLowProfile(broken)).not.toThrow();
    expect(loadStartProfile(null)).toBe('high');
  });
});

describe('projection (G4)', () => {
  const cam = { x: 0, y: 1000, z: 0, depth: cameraDepth(100) };
  it('narrows the road toward the horizon', () => {
    const near = projectPoint(0, 0, 400, cam, 320, 568, 2000);
    const far = projectPoint(0, 0, 40000, cam, 320, 568, 2000);
    expect(near.w).toBeGreaterThan(far.w);
    expect(near.y).toBeGreaterThan(far.y);
    expect(far.x).toBeCloseTo(160, 6);
  });
  it('branches start at their lanes, spread, and meet in one lane at the merge', () => {
    expect(branchFactor(0, 4000, 2000)).toBe(1);
    expect(branchFactor(3000, 4000, 2000)).toBeCloseTo(1.6, 6);
    expect(branchFactor(6000, 4000, 2000)).toBe(0);
    expect(branchFactor(4999, 4000, 2000)).toBeGreaterThan(0);
    expect(branchCenter(0, 0, 4, 1400, 4000, 2000)).toBeCloseTo(-2100, 6);
    expect(branchCenter(3000, 3, 4, 1400, 4000, 2000)).toBeCloseTo(3360, 6);
    expect(branchCenter(6000, 3, 4, 1400, 4000, 2000)).toBe(0);
    expect(branchCenter(3000, 1, 3, 1400, 4000, 2000)).toBe(0);
  });
});

describe('track runtime (G5)', () => {
  const spec = protocolSpec(1)!;

  it('follows the clock readings only, clamps frames to 50 ms, and carries no pause', () => {
    const rt = createTrackRuntime(spec, 1);
    rt.frame(50);
    expect(rt.motion().kinMs).toBe(50);
    rt.frame(1050); // a 1000 ms gap (for example the first frame after a hidden tab) moves only 50 ms
    expect(rt.motion().kinMs).toBe(100);
    rt.frame(1050); // same reading: no movement
    expect(rt.motion().kinMs).toBe(100);
  });

  it('emits every line once, in order, and the finish', () => {
    const rt = createTrackRuntime(spec, 1);
    const events: string[] = [];
    let t = 0;
    while (!rt.finished() && t < 400000) {
      t += 16;
      for (const e of rt.frame(t)) {
        events.push(e.type === 'finish' ? 'finish' : `${e.type}:${e.fork}`);
        if (e.type === 'decisionLine') rt.applyOutcome(e.fork % 2 === 0);
      }
    }
    expect(events.filter((e) => e.startsWith('questionStart'))).toHaveLength(10);
    expect(events.filter((e) => e.startsWith('decisionLine'))).toHaveLength(10);
    expect(events[events.length - 1]).toBe('finish');
    expect(events.indexOf('questionStart:1')).toBeGreaterThan(events.indexOf('merge:0'));
  });
});
