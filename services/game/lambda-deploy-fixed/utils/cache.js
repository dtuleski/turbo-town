"use strict";
/**
 * Generic in-memory cache with TTL
 * Persists across Lambda invocations within the same container
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticsCache = exports.themeCache = exports.Cache = void 0;
class Cache {
    constructor(ttlMs) {
        this.data = new Map();
        this.ttlMs = ttlMs;
    }
    /**
     * Get value from cache
     * Returns null if not found or expired
     */
    get(key) {
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
    set(key, value) {
        this.data.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs,
        });
    }
    /**
     * Delete value from cache
     */
    delete(key) {
        this.data.delete(key);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.data.clear();
    }
    /**
     * Get cache size
     */
    size() {
        return this.data.size;
    }
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== null;
    }
}
exports.Cache = Cache;
// Theme cache with 5-minute TTL
exports.themeCache = new Cache(5 * 60 * 1000);
// Statistics cache with 5-minute TTL
exports.statisticsCache = new Cache(5 * 60 * 1000);
//# sourceMappingURL=cache.js.map