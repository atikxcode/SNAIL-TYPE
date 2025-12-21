// lib/cache/cacheManager.js
// Caching strategies implementation for the typing application

/**
 * Implements caching strategies as per the project specification:
 * - Cache leaderboard queries (5-minute expiry)
 * - Cache user stats on dashboard (30-second expiry)
 * - Use Next.js revalidate or cache() API
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Sets a value in cache with TTL (time to live)
   */
  set(key, value, ttl = 300000) { // Default 5 minutes (300,000 ms)
    // Clear existing timer if exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store the value
    this.cache.set(key, value);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  /**
   * Gets a value from cache
   */
  get(key) {
    return this.cache.get(key);
  }

  /**
   * Checks if a key exists in cache
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Deletes a key from cache
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  /**
   * Clears all cache
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Initialize the cache manager
export const cacheManager = new CacheManager();

/**
 * Specific caching functions for different use cases
 */

// Cache leaderboard data (5-minute expiry as per spec)
export const leaderboardCache = {
  setLeaderboard: (period, mode, data) => {
    const key = `leaderboard:${period}:${mode}`;
    cacheManager.set(key, data, 5 * 60 * 1000); // 5 minutes
  },
  
  getLeaderboard: (period, mode) => {
    const key = `leaderboard:${period}:${mode}`;
    return cacheManager.get(key);
  },
  
  invalidateLeaderboard: (period, mode) => {
    const key = `leaderboard:${period}:${mode}`;
    cacheManager.delete(key);
  }
};

// Cache user stats (30-second expiry as per spec)
export const userStatsCache = {
  setUserStats: (userId, data) => {
    const key = `userStats:${userId}`;
    cacheManager.set(key, data, 30 * 1000); // 30 seconds
  },
  
  getUserStats: (userId) => {
    const key = `userStats:${userId}`;
    return cacheManager.get(key);
  },
  
  invalidateUserStats: (userId) => {
    const key = `userStats:${userId}`;
    cacheManager.delete(key);
  }
};

// Cache session data
export const sessionCache = {
  setSession: (sessionId, data) => {
    const key = `session:${sessionId}`;
    cacheManager.set(key, data, 60 * 1000); // 1 minute
  },
  
  getSession: (sessionId) => {
    const key = `session:${sessionId}`;
    return cacheManager.get(key);
  },
  
  invalidateSession: (sessionId) => {
    const key = `session:${sessionId}`;
    cacheManager.delete(key);
  }
};

// Cache daily plans
export const dailyPlanCache = {
  setDailyPlan: (userId, date, data) => {
    const key = `dailyPlan:${userId}:${date}`;
    cacheManager.set(key, data, 60 * 60 * 1000); // 1 hour
  },
  
  getDailyPlan: (userId, date) => {
    const key = `dailyPlan:${userId}:${date}`;
    return cacheManager.get(key);
  },
  
  invalidateDailyPlan: (userId, date) => {
    const key = `dailyPlan:${userId}:${date}`;
    cacheManager.delete(key);
  }
};

/**
 * Higher-order function to add caching to any async function
 */
export function withCache(fn, keyGenerator, ttl = 300000) {
  return async function (...args) {
    // Generate cache key
    const key = typeof keyGenerator === 'function' 
      ? keyGenerator(...args) 
      : keyGenerator;
    
    // Try to get from cache first
    const cachedResult = cacheManager.get(key);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    // If not in cache, call the original function
    const result = await fn.apply(this, ...args);
    
    // Store result in cache
    cacheManager.set(key, result, ttl);
    
    return result;
  };
}

/**
 * Cache decorator for API routes using Next.js revalidate
 * This is a simplified version - in real Next.js app, you'd use the revalidate option
 */
export function withNextCache(revalidateSeconds = 300) {
  return function (handler) {
    return async function (req, res) {
      // In a real Next.js API route, you would set cache headers
      // res.setHeader('Cache-Control', `s-maxage=${revalidateSeconds}, stale-while-revalidate=${revalidateSeconds}`);
      
      return await handler(req, res);
    };
  };
}

/**
 * Memory-efficient LRU (Least Recently Used) cache implementation
 * Useful for caching frequently accessed small items
 */
export class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    const value = this.cache.get(key);
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove first item (least recently used)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
  
  has(key) {
    return this.cache.has(key);
  }
  
  delete(key) {
    return this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  get size() {
    return this.cache.size;
  }
  
  get keys() {
    return Array.from(this.cache.keys());
  }
}

// Export an LRU cache instance for small, frequently accessed items
export const lruCache = new LRUCache(50);