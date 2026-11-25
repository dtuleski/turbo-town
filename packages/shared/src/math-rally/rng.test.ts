import { createRng } from './rng';

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.nextUint32()).toBe(b.nextUint32());
  });

  it('coerces the seed to uint32', () => {
    expect(createRng(-1).nextUint32()).toBe(createRng(0xffffffff).nextUint32());
  });

  it('pins the first values for seed 1 (mulberry32)', () => {
    const r = createRng(1);
    expect([r.nextUint32(), r.nextUint32(), r.nextUint32()]).toEqual([2693262067, 11749833, 2265367787]);
  });

  it('keeps nextInt within bounds and hits both ends', () => {
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.nextInt(-3, 3);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect(seen.size).toBe(7);
  });

  it('refuses an empty or inverted range', () => {
    expect(() => createRng(1).nextInt(3, 2)).toThrow(RangeError);
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });

  it('shuffle keeps the elements', () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(createRng(3).shuffle(items).sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('weightedPick follows the weights', () => {
    const r = createRng(11);
    let a = 0;
    for (let i = 0; i < 10000; i++) {
      if (r.weightedPick([{ value: 'a', weight: 30 }, { value: 'b', weight: 70 }]) === 'a') a++;
    }
    expect(a / 10000).toBeGreaterThan(0.27);
    expect(a / 10000).toBeLessThan(0.33);
  });
});
