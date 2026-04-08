/**
 * Generic in-memory cache with TTL
 * Persists across Lambda invocations within the same container
 */
export declare class Cache<T> {
    private data;
    private ttlMs;
    constructor(ttlMs: number);
    /**
     * Get value from cache
     * Returns null if not found or expired
     */
    get(key: string): T | null;
    /**
     * Set value in cache with TTL
     */
    set(key: string, value: T): void;
    /**
     * Delete value from cache
     */
    delete(key: string): void;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache size
     */
    size(): number;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
}
export declare const themeCache: Cache<any>;
export declare const statisticsCache: Cache<any>;
//# sourceMappingURL=cache.d.ts.map