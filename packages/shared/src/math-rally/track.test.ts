import { MR_SUPPORTED_PROTOCOLS, protocolSpec } from './protocols';
import { trackLayout } from './track';
import { MATH_RALLY_DIFFICULTIES } from './types';

const FRAME_S = 0.05;

describe.each(MR_SUPPORTED_PROTOCOLS.map((v) => [v]))('track layout contracts, protocol %i', (version) => {
  const spec = protocolSpec(version)!;
  const t = spec.track;

  it.each(MATH_RALLY_DIFFICULTIES.map((d) => [d]))('difficulty %i', (d) => {
    const L = trackLayout(spec, d);
    const forks = spec.params[d].forks;
    expect(L.decisionLine).toHaveLength(forks);

    for (let k = 0; k < forks; k++) {
      const qs = L.questionStart[k]!;
      const dl = L.decisionLine[k]!;
      const me = L.mergeEnd[k]!;
      // Reading window at top speed (FR-MK-8).
      expect((dl - qs) / t.maxSpeed).toBeGreaterThanOrEqual(spec.params[d].readSeconds);
      // Merge ends before the next question.
      if (k + 1 < forks) expect(me).toBeLessThan(L.questionStart[k + 1]!);
      // Next line beyond the longest window plus one frame at top speed (frame-rule argument).
      const longestWindow = Math.max(t.boostSeconds * t.maxSpeed, t.slowSeconds * t.slowFactor * t.cruiseSpeed);
      const next = k + 1 < forks ? L.decisionLine[k + 1]! : L.finishLine;
      expect(next - dl).toBeGreaterThan(longestWindow + FRAME_S * t.maxSpeed);
      // Windows never overlap: the next line is more than the longest window away in time.
      expect((next - dl) / t.maxSpeed).toBeGreaterThan(Math.max(t.boostSeconds, t.slowSeconds));
    }
    // The correct answer stays visible at least 1.5 s after a wrong pick.
    expect((t.branchLength + t.gapLength) / t.maxSpeed).toBeGreaterThanOrEqual(1.5);
    // Acceleration ends before the first decision line.
    expect(t.cruiseSpeed ** 2 / (2 * t.accel)).toBeLessThan(L.decisionLine[0]!);
    expect(L.finishLine).toBeGreaterThan(L.mergeEnd[forks - 1]!);
  });
});

describe('protocol v1 layout', () => {
  const spec = protocolSpec(1)!;

  it('matches the Easy positions of the functional design', () => {
    const L = trackLayout(spec, 1);
    expect(L.questionStart[0]).toBe(600);
    expect(L.decisionLine[0]).toBe(30600);
    expect(L.mergeEnd[0]).toBe(36600);
    expect(L.questionStart[1]).toBe(36800);
    expect(L.decisionLine[9]).toBe(356400);
    expect(L.finishLine).toBe(371400);
  });

  it('uses the approach lengths of the functional design', () => {
    expect(spec.track.approachLength).toEqual({ 1: 30000, 2: 26400, 3: 22600, 4: 18800 });
  });
});

describe('protocolSpec', () => {
  it.each([0, 2, 1.5, '1', null, undefined, NaN])('returns null for %p', (v) => {
    expect(protocolSpec(v)).toBeNull();
  });
});
