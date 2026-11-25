/**
 * Seeded RNG (S2): mulberry32. All Math Rally randomness comes from here,
 * never from Math.random, so races are reproducible from their seed.
 */
export interface Rng {
  nextUint32(): number;
  /** Uniform integer in [minIncl, maxIncl]. */
  nextInt(minIncl: number, maxIncl: number): number;
  pick<T>(items: readonly T[]): T;
  /** Picks an item with probability proportional to its weight. */
  weightedPick<T>(items: readonly { value: T; weight: number }[]): T;
  /** Returns a shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function nextUint32(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  function nextInt(minIncl: number, maxIncl: number): number {
    if (!Number.isInteger(minIncl) || !Number.isInteger(maxIncl) || maxIncl < minIncl) {
      throw new RangeError(`invalid range ${minIncl}..${maxIncl}`);
    }
    const span = maxIncl - minIncl + 1;
    // span is small (well under 2^32), so the modulo bias is negligible and deterministic.
    return minIncl + (nextUint32() % span);
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('pick from an empty list');
    return items[nextInt(0, items.length - 1)] as T;
  }

  function weightedPick<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    if (items.length === 0 || total <= 0) throw new RangeError('weightedPick needs positive weights');
    let r = nextInt(0, total - 1);
    for (const item of items) {
      if (r < item.weight) return item.value;
      r -= item.weight;
    }
    return (items[items.length - 1] as { value: T }).value;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }

  return { nextUint32, nextInt, pick, weightedPick, shuffle };
}
