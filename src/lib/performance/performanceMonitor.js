// lib/performance/performanceMonitor.js
// Performance monitoring component for the typing application

'use client';

import { useEffect, useState } from 'react';

/**
 * Performance monitoring component
 * Tracks and reports performance metrics as per the project specification
 */
export function PerformanceMonitor({ children }) {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    memoryUsage: null,
    interactionLatency: [],
    frameRate: [],
  });

  useEffect(() => {
    // Track render count
    setMetrics(prev => ({ ...prev, renderCount: prev.renderCount + 1 }));

    // Track memory usage if available
    if (performance.memory) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        }
      }));
    }

    // Track frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 0;

    const onFrame = () => {
      frameCount++;
      const now = performance.now();
      
      if (now >= lastTime + 1000) { // Every second
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
        
        setMetrics(prev => ({
          ...prev,
          frameRate: [...prev.frameRate.slice(-9), fps] // Keep last 10 values
        }));
      }
      
      requestAnimationFrame(onFrame);
    };

    const frameId = requestAnimationFrame(onFrame);

    // Track interaction latency
    const startEvents = ['mousedown', 'keydown', 'touchstart'];
    const endEvents = ['mouseup', 'keyup', 'touchend'];
    
    let interactionStart = 0;

    const trackInteractionStart = () => {
      interactionStart = performance.now();
    };

    const trackInteractionEnd = () => {
      if (interactionStart > 0) {
        const latency = performance.now() - interactionStart;
        setMetrics(prev => ({
          ...prev,
          interactionLatency: [...prev.interactionLatency.slice(-9), latency]
        }));
        interactionStart = 0;
      }
    };

    startEvents.forEach(event => {
      document.addEventListener(event, trackInteractionStart, { passive: true });
    });

    endEvents.forEach(event => {
      document.addEventListener(event, trackInteractionEnd, { passive: true });
    });

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      startEvents.forEach(event => {
        document.removeEventListener(event, trackInteractionStart);
      });
      endEvents.forEach(event => {
        document.removeEventListener(event, trackInteractionEnd);
      });
    };
  }, []);

  // In a real app, we'd send this to an analytics service
  useEffect(() => {
    // Log performance metrics periodically
    const interval = setInterval(() => {
      console.log('Performance Metrics:', {
        renderCount: metrics.renderCount,
        memoryUsage: metrics.memoryUsage,
        avgInteractionLatency: metrics.interactionLatency.length > 0 
          ? metrics.interactionLatency.reduce((a, b) => a + b, 0) / metrics.interactionLatency.length 
          : 0,
        currentFrameRate: metrics.frameRate[metrics.frameRate.length - 1] || 0
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [metrics]);

  return <>{children}</>;
}

/**
 * Performance metrics provider for the app
 */
export function PerformanceMetricsProvider({ children }) {
  return (
    <PerformanceMonitor>
      {children}
    </PerformanceMonitor>
  );
}

/**
 * Hook to access performance metrics
 */
export function usePerformanceMetrics() {
  // In a real implementation, this would access context
  // For now, we'll return a mock implementation
  return {
    getMetrics: () => ({
      renderCount: 0,
      memoryUsage: null,
      interactionLatency: [],
      frameRate: [],
    }),
    reportMetrics: () => {
      console.log('Reporting performance metrics...');
    }
  };
}

/**
 * Component that visualizes performance metrics
 */
export function PerformanceMetricsDisplay() {
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    memoryUsed: 0,
    memoryTotal: 0,
    avgLatency: 0,
    currentFps: 0
  });

  useEffect(() => {
    if (!showMetrics) return;

    const updateMetrics = () => {
      setMetrics(prev => ({
        ...prev,
        renderCount: prev.renderCount + 1,
        memoryUsed: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0, // MB
        memoryTotal: performance.memory ? performance.memory.totalJSHeapSize / 1024 / 1024 : 0, // MB
        currentFps: prev.currentFps // Would be calculated from frame tracking
      }));
    };

    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, [showMetrics]);

  if (!showMetrics) {
    return (
      <button 
        onClick={() => setShowMetrics(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-sm z-50"
      >
        Show Perf Metrics
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded text-xs z-50 max-w-xs">
      <div className="flex justify-between items-center mb-1">
        <span>Performance Metrics</span>
        <button 
          onClick={() => setShowMetrics(false)}
          className="text-gray-300 hover:text-white"
        >
          ×
        </button>
      </div>
      <div>Render Count: {metrics.renderCount}</div>
      <div>Memory: {metrics.memoryUsed?.toFixed(1)} MB / {metrics.memoryTotal?.toFixed(1)} MB</div>
      <div>Avg Latency: {metrics.avgLatency.toFixed(2)} ms</div>
      <div>FPS: {metrics.currentFps}</div>
    </div>
  );
}