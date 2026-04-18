import { describe, it, expect, bench } from 'vitest';
import { chunk } from '@/lib/utils';

/**
 * Performance benchmarks for critical utility functions
 * Run with: vitest bench
 */

describe('Performance Benchmarks', () => {
  describe('chunk function performance', () => {
    bench('chunk array of 1000 items into 30-item chunks', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      chunk(largeArray, 30);
    });

    bench('chunk array of 10000 items into 30-item chunks', () => {
      const veryLargeArray = Array.from({ length: 10000 }, (_, i) => i);
      chunk(veryLargeArray, 30);
    });

    it('should chunk 1000 items in under 5ms', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const start = performance.now();
      chunk(largeArray, 30);
      const end = performance.now();

      expect(end - start).toBeLessThan(5);
    });

    it('should maintain correct chunking for large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const result = chunk(largeArray, 30);

      // Verify all items are preserved
      expect(result.flat()).toEqual(largeArray);

      // Verify chunk sizes
      expect(result.length).toBe(34); // 1000 / 30 = 33.33... -> 34 chunks
      expect(result[0]).toHaveLength(30);
      expect(result[result.length - 1]).toHaveLength(10); // Last chunk has remainder
    });
  });
});
