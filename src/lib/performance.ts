/**
 * Performance monitoring utilities
 * Tracks key performance metrics and provides insights
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];

/**
 * Mark the start of a performance measurement
 */
export function markStart(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${name}-start`);
  }
}

/**
 * Mark the end of a performance measurement and calculate duration
 */
export function markEnd(name: string): number | null {
  if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
    performance.mark(`${name}-end`);
    try {
      const measure = performance.measure(name, `${name}-start`, `${name}-end`);
      const metric: PerformanceMetric = {
        name,
        value: measure.duration,
        timestamp: Date.now(),
      };
      metrics.push(metric);
      
      // Keep only last 100 metrics
      if (metrics.length > 100) {
        metrics.shift();
      }
      
      return measure.duration;
    } catch (e) {
      // Measurement might fail if marks don't exist
      return null;
    }
  }
  return null;
}

/**
 * Get all recorded performance metrics
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/**
 * Clear all recorded metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
  if (typeof performance !== 'undefined' && performance.clearMarks && performance.clearMeasures) {
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/**
 * Log performance metrics to console (development only)
 */
export function logMetrics(): void {
  if (process.env.NODE_ENV === 'development' && metrics.length > 0) {
    console.group('Performance Metrics');
    metrics.forEach(metric => {
      console.log(`${metric.name}: ${metric.value.toFixed(2)}ms`);
    });
    console.groupEnd();
  }
}

/**
 * Get web vitals using the Performance API
 */
export function getWebVitals(): {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
} {
  const vitals: Record<string, number> = {};
  
  if (typeof performance === 'undefined') {
    return vitals;
  }

  // First Contentful Paint
  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  if (fcpEntry) {
    vitals.fcp = fcpEntry.startTime;
  }

  // Time to First Byte
  const navigationEntries = performance.getEntriesByType('navigation');
  if (navigationEntries.length > 0) {
    const navEntry = navigationEntries[0] as PerformanceNavigationTiming;
    vitals.ttfb = navEntry.responseStart - navEntry.requestStart;
  }

  return vitals;
}
