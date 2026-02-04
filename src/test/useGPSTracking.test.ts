import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGPSTracking } from '@/hooks/useGPSTracking';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('useGPSTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useGPSTracking());
    
    expect(result.current.isTracking).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.coordinates).toEqual([]);
    expect(result.current.totalDistance).toBe(0);
    expect(result.current.totalDistanceMiles).toBe(0);
    expect(result.current.isGeolocationSupported).toBe(true);
  });

  it('should detect geolocation support', () => {
    const { result } = renderHook(() => useGPSTracking());
    expect(result.current.isGeolocationSupported).toBe(true);
  });

  it('should handle permission request success', async () => {
    const mockPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    const { result } = renderHook(() => useGPSTracking());
    
    let permissionGranted = false;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });
    
    expect(permissionGranted).toBe(true);
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('should handle permission denied', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      message: 'User denied geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useGPSTracking());
    
    let permissionGranted = false;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });
    
    expect(permissionGranted).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('should start tracking after permission granted', async () => {
    const mockPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    mockGeolocation.watchPosition.mockReturnValue(123); // mock watch ID

    const { result } = renderHook(() => useGPSTracking());
    
    await act(async () => {
      await result.current.startTracking();
    });

    await waitFor(() => {
      expect(result.current.isTracking).toBe(true);
    });
    
    expect(mockGeolocation.watchPosition).toHaveBeenCalled();
  });

  it('should stop tracking', async () => {
    const mockPosition = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });
    mockGeolocation.watchPosition.mockReturnValue(123);

    const { result } = renderHook(() => useGPSTracking());
    
    await act(async () => {
      await result.current.startTracking();
    });

    await waitFor(() => {
      expect(result.current.isTracking).toBe(true);
    });

    act(() => {
      result.current.stopTracking();
    });

    expect(result.current.isTracking).toBe(false);
    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(123);
  });

  it('should pause and resume tracking', async () => {
    const { result } = renderHook(() => useGPSTracking());
    
    act(() => {
      result.current.pauseTracking();
    });
    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.resumeTracking();
    });
    expect(result.current.isPaused).toBe(false);
  });

  it('should reset tracking data', () => {
    const { result } = renderHook(() => useGPSTracking());
    
    act(() => {
      result.current.resetTracking();
    });
    
    expect(result.current.coordinates).toEqual([]);
    expect(result.current.totalDistance).toBe(0);
    expect(result.current.totalDistanceMiles).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.isTracking).toBe(false);
  });
});
