import { describe, it, expect, vi } from 'vitest';
import { METERS_PER_MILE, MIN_DISTANCE_THRESHOLD_METERS, DEFAULT_GPS_UPDATE_INTERVAL_MS } from '@/lib/gpsConstants';

describe('GPS Constants', () => {
  it('should have correct conversion factor for meters to miles', () => {
    // 1 mile = 1609.344 meters (exact)
    expect(METERS_PER_MILE).toBe(1609.344);
  });

  it('should convert miles to meters correctly', () => {
    const miles = 5;
    const meters = miles * METERS_PER_MILE;
    expect(meters).toBe(8046.72);
  });

  it('should convert meters to miles correctly', () => {
    const meters = 1609.344;
    const miles = meters / METERS_PER_MILE;
    expect(miles).toBe(1);
  });

  it('should have reasonable GPS noise threshold', () => {
    // Should filter movements less than 1 meter to avoid GPS jitter
    expect(MIN_DISTANCE_THRESHOLD_METERS).toBe(1);
    expect(MIN_DISTANCE_THRESHOLD_METERS).toBeGreaterThan(0);
    expect(MIN_DISTANCE_THRESHOLD_METERS).toBeLessThan(10);
  });

  it('should have battery-efficient update interval', () => {
    // Should be at least 1 second (1000ms) for battery efficiency
    expect(DEFAULT_GPS_UPDATE_INTERVAL_MS).toBeGreaterThanOrEqual(1000);
    // Typical good value is 5 seconds (5000ms)
    expect(DEFAULT_GPS_UPDATE_INTERVAL_MS).toBe(5000);
  });
});
