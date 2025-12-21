// lib/cache/cacheConfig.js
// Cache configuration and utilities for Next.js application

/**
 * Configuration for Next.js caching strategies
 * Implements the caching recommendations from the project specification:
 * - Cache leaderboard queries (5-minute expiry)
 * - Cache user stats on dashboard (30-second expiry)
 * - Use Next.js revalidate or cache() API
 */

// Cache revalidation times in seconds
export const CACHE_TIMES = {
  leaderboard: 300,      // 5 minutes for leaderboard queries
  userStats: 30,         // 30 seconds for user stats
  sessionData: 60,       // 1 minute for session data
  dailyPlan: 3600,       // 1 hour for daily plans
  achievements: 900,     // 15 minutes for achievements
  userPreferences: 1800, // 30 minutes for user preferences
};

/**
 * Example of how to use Next.js caching in server components
 * This would be used in app directory server components
 */
export async function getCachedUserStats(userId) {
  // This is how you would use Next.js cache() API in a real server component
  // import { cache } from 'react';
  
  // For demonstration, we'll simulate the caching behavior
  const cacheKey = `userStats:${userId}`;
  
  // In a real Next.js app, you would use:
  // const fetchUserStats = cache(async (id) => {
  //   const res = await fetch(`/api/users/${id}/stats`);
  //   return res.json();
  // });
  
  // Simulated fetch with cache
  const cachedData = global.cache ? global.cache.get(cacheKey) : null;
  if (cachedData) {
    return cachedData;
  }
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
  
  const data = {
    userId,
    totalTests: Math.floor(Math.random() * 100),
    currentStreak: Math.floor(Math.random() * 30),
    avgWpm: 65 + Math.random() * 20,
    bestWpm: 80 + Math.random() * 30,
  };
  
  // Store in cache for 30 seconds
  if (global.cache) {
    global.cache.set(cacheKey, data, 30 * 1000);
  }
  
  return data;
}

/**
 * Example of how to use revalidate in API routes
 * This would be used in app/api routes
 */
export function createCachedApiHandler(handler, revalidateTime = 300) {
  return async function (req, res) {
    // In a real Next.js API route, you would set cache headers
    // res.setHeader('Cache-Control', `s-maxage=${revalidateTime}, stale-while-revalidate=${revalidateTime * 2}`);
    
    return await handler(req, res);
  };
}

/**
 * Cache utilities for client-side components
 */
export class ClientCache {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  set(key, value, ttl = 300000) { // Default 5 minutes
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    this.store.set(key, value);

    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key) {
    return this.store.get(key);
  }

  has(key) {
    return this.store.has(key);
  }

  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    this.store.delete(key);
    this.timers.delete(key);
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }
}

// Export a client-side cache instance
export const clientCache = new ClientCache();

/**
 * Cache key generators for common operations
 */
export const cacheKeyGenerators = {
  leaderboard: (period, mode, category) => `leaderboard:${period}:${mode}:${category}`,
  userStats: (userId) => `userStats:${userId}`,
  userSessions: (userId, limit = 20) => `userSessions:${userId}:${limit}`,
  dailyPlan: (userId, date) => `dailyPlan:${userId}:${date.toISOString().split('T')[0]}`,
  weaknessProfile: (userId) => `weaknessProfile:${userId}`,
  userPreferences: (userId) => `userPreferences:${userId}`,
};

/**
 * Cache middleware for API routes
 */
export function cacheMiddleware(revalidateTime = 300) {
  return (handler) => {
    return async (req, res) => {
      // Set cache headers for CDN and browser caching
      res.setHeader(
        'Cache-Control',
        `public, s-maxage=${revalidateTime}, stale-while-revalidate=${revalidateTime * 2}`
      );
      
      return await handler(req, res);
    };
  };
}

/**
 * Initialize cache if not already set up
 */
export function initializeCache() {
  if (typeof window !== 'undefined') {
    // Client-side
    if (!window.appCache) {
      window.appCache = new ClientCache();
    }
  } else {
    // Server-side
    if (!global.cache) {
      global.cache = new ClientCache();
    }
  }
}

// Initialize cache on module load
initializeCache();