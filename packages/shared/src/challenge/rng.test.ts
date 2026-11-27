import { mulberry32, pick, randInt, seedFrom, shuffle } from './rng';

describe('seeded rng (golden values: a change here changes every stored challenge seed)', () => {
  it('seedFrom is 32-bit FNV-1a', () => {
    expect(seedFrom('')).toBe(2166136261);
    expect(seedFrom('a')).toBe(3826002220);
    expect(seedFrom('draw:2026-11-26')).toBe(991954077);
  });

  it('mulberry32 sequence is stable', () => {
    const r = mulberry32(seedFrom('2026-11-26:code-a-bot'));
    expect([r(), r(), r()]).toEqual([0.08795696729794145, 0.9443610003218055, 0.3255644559394568]);
  });

  it('randInt and shuffle are stable', () => {
    const q = mulberry32(42);
    expect([randInt(q, 1, 6), randInt(q, 1, 6), randInt(q, 1, 6), randInt(q, 1, 6)]).toEqual([4, 3, 6, 5]);
    expect(shuffle(mulberry32(7), [1, 2, 3, 4, 5, 6])).toEqual([5, 2, 3, 4, 6, 1]);
  });

  it('stays in range and does not mutate the input', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = randInt(r, -2, 2);
      expect(n).toBeGreaterThanOrEqual(-2);
      expect(n).toBeLessThanOrEqual(2);
    }
    const items = [1, 2, 3];
    const out = shuffle(r, items);
    expect(items).toEqual([1, 2, 3]);
    expect([...out].sort()).toEqual([1, 2, 3]);
  });

  it('pick throws on an empty list', () => {
    expect(() => pick(mulberry32(1), [])).toThrow(RangeError);
    expect(pick(mulberry32(1), ['only'])).toBe('only');
  });
});
