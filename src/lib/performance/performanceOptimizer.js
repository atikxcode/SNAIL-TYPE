// lib/performance/performanceOptimizer.js
// Frontend performance optimization utilities

/**
 * Implements frontend performance optimization strategies as per the project specification:
 * - Lazy loading for dashboard graphs
 * - Efficient rendering for leaderboard
 * - Bundle size optimization
 * - Image optimization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Lazy loader hook for components that should only load when needed
 */
export function useLazyLoad(importFn, deps = []) {
  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadComponent() {
      try {
        setLoading(true);
        const module = await importFn();
        if (isMounted) {
          setComponent(module.default || module);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    }

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, deps);

  return { component, loading, error };
}

/**
 * Intersection Observer hook for lazy loading elements when they come into view
 */
export function useIntersectionObserver(options = {}) {
  const [element, setElement] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1, // Trigger when 10% of element is visible
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [element, options]);

  return [setElement, isVisible];
}

/**
 * Memoized expensive calculations
 */
export function useExpensiveCalculation(computation, dependencies) {
  return useMemo(() => {
    return computation();
  }, dependencies);
}

/**
 * Debounced function hook
 */
export function useDebounce(callback, delay) {
  const [debouncedFunction, setDebouncedFunction] = useState(() => () => {});

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFunction(() => callback);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [callback, delay]);

  return debouncedFunction;
}

/**
 * Throttled function hook
 */
export function useThrottle(callback, limit) {
  const [lastCall, setLastCall] = useState(0);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      callback(...args);
      setLastCall(now);
    }
  }, [callback, lastCall, limit]);
}

/**
 * Virtualized list component for efficient rendering of large datasets
 * (e.g., leaderboard with 1000+ entries)
 */
export function VirtualizedList({ 
  items, 
  itemHeight = 50, 
  containerHeight = 400, 
  renderItem,
  overscan = 5 
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  // Calculate total height for scroll container
  const totalHeight = items.length * itemHeight;
  
  // Calculate visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  const style = {
    height: totalHeight,
    width: '100%',
    position: 'relative',
  };
  
  const visibleStyle = {
    position: 'absolute',
    top: startIndex * itemHeight,
    width: '100%',
  };

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div 
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={style}>
        <div style={visibleStyle}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return renderItem(item, actualIndex);
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Image optimization utility component
 */
export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  placeholder = 'empty',
  ...props 
}) {
  const [isLoading, setIsLoading] = useState(true);
  
  // In a real Next.js app, we'd use next/image
  // For now, we'll create an optimized img tag
  return (
    <div style={{ position: 'relative', width, height }} className={className}>
      {isLoading && placeholder === 'blur' && (
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          Loading...
        </div>
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s',
        }}
        onLoad={() => setIsLoading(false)}
        {...props}
      />
    </div>
  );
}

/**
 * Performance monitoring utilities
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
  }

  /**
   * Measures the performance of a function
   */
  async measure(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(duration);

    return result;
  }

  /**
   * Gets performance metrics
   */
  getMetrics() {
    const metrics = {};
    
    for (const [name, durations] of this.metrics) {
      const count = durations.length;
      const total = durations.reduce((sum, time) => sum + time, 0);
      const avg = total / count;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      metrics[name] = {
        count,
        total,
        average: avg,
        min,
        max,
      };
    }
    
    return metrics;
  }

  /**
   * Reports performance to analytics (simulated)
   */
  reportPerformance() {
    const metrics = this.getMetrics();
    console.log('Performance Report:', metrics);
    
    // In a real app, this would send to an analytics service
    // Example: send metrics to a logging service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Send to analytics service in production
      // fetch('/api/performance', {
      //   method: 'POST',
      //   body: JSON.stringify(metrics),
      //   headers: { 'Content-Type': 'application/json' }
      // });
    }
  }

  /**
   * Resets metrics
   */
  reset() {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to track component render performance
 */
export function useRenderPerformance(componentName) {
  useEffect(() => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      performanceMonitor.measure(`${componentName}_render`, async () => {
        // Simulate async operation to match expected interface
        return end - start;
      });
    };
  }, [componentName]);
}

/**
 * Efficient data structure for leaderboard data
 */
export class LeaderboardDataManager {
  constructor() {
    this.data = [];
    this.indexMap = new Map(); // For O(1) lookups by user ID
    this.sorted = false;
  }

  setData(newData) {
    this.data = newData;
    this.indexMap.clear();
    
    // Build index map
    this.data.forEach((entry, index) => {
      this.indexMap.set(entry.user_id, index);
    });
    
    this.sorted = false;
  }

  sort(sortBy = 'rank', order = 'asc') {
    if (!this.sorted) {
      this.data.sort((a, b) => {
        if (order === 'asc') {
          return a[sortBy] > b[sortBy] ? 1 : -1;
        } else {
          return a[sortBy] < b[sortBy] ? 1 : -1;
        }
      });
      this.sorted = true;
    }
  }

  getRange(start, end) {
    return this.data.slice(start, end);
  }

  getByUserId(userId) {
    const index = this.indexMap.get(userId);
    return index !== undefined ? this.data[index] : null;
  }

  getLength() {
    return this.data.length;
  }
}

/**
 * Memory-efficient pagination for large datasets
 */
export function usePaginatedData(data, itemsPerPage = 20) {
  const [currentPage, setCurrentPage] = useState(0);
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  
  const currentData = useMemo(() => {
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex]);
  
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);
  
  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);
  
  return {
    data: currentData,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasMore: endIndex < data.length,
  };
}

/**
 * Efficient WPM calculation that minimizes re-renders
 */
export function useWpmCalculator() {
    const calculateWpm = useCallback((chars, timeInMinutes) => {
    if (timeInMinutes <= 0) return 0;
    return Math.round((chars / 5) / timeInMinutes);
  }, []);

  return { calculateWpm };
}