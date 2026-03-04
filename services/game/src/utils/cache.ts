/**
 * Generic in-memory cache with TTL
 * Persists across Lambda invocations within the same container
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache<T> {
  private data = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.data.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key: string, value: T): void {
    this.data.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.data.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.data.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Theme cache with 5-minute TTL
export const themeCache = new Cache<any>(5 * 60 * 1000);

// Statistics cache with 5-minute TTL
export const statisticsCache = new Cache<any>(5 * 60 * 1000);
