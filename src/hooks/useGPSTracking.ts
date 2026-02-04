import { useState, useCallback, useRef, useEffect } from 'react';
import { GPSCoordinate, GPSTrackingState } from '@/types/mileage';
import { toast } from 'sonner';

const METERS_PER_MILE = 1609.344;
const DEFAULT_UPDATE_INTERVAL = 5000; // 5 seconds - battery efficient
const HIGH_ACCURACY = true;

// Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(coord1: GPSCoordinate, coord2: GPSCoordinate): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export const useGPSTracking = (updateInterval: number = DEFAULT_UPDATE_INTERVAL) => {
  const [state, setState] = useState<GPSTrackingState>({
    isTracking: false,
    isPaused: false,
    coordinates: [],
    totalDistance: 0,
    totalDistanceMiles: 0,
    currentSpeed: 0,
    averageSpeed: 0,
    duration: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if geolocation is supported
  const isGeolocationSupported = 'geolocation' in navigator;

  // Request location permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isGeolocationSupported) {
      toast.error('Geolocation is not supported by your browser');
      return false;
    }

    try {
      // Request permission by getting the current position
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: HIGH_ACCURACY,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      return true;
    } catch (error) {
      const err = error as GeolocationPositionError;
      let errorMessage = 'Failed to get location permission';
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Please check your device settings.';
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again.';
          break;
      }
      
      setState((prev) => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
      return false;
    }
  }, [isGeolocationSupported]);

  // Handle new position
  const handlePosition = useCallback((position: GeolocationPosition) => {
    const now = Date.now();
    
    // Throttle updates based on interval
    if (now - lastUpdateTimeRef.current < updateInterval) {
      return;
    }
    lastUpdateTimeRef.current = now;

    const newCoordinate: GPSCoordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude ?? undefined,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading ?? undefined,
      speed: position.coords.speed ?? undefined,
      timestamp: position.timestamp,
    };

    setState((prev) => {
      const coordinates = [...prev.coordinates, newCoordinate];
      let totalDistance = prev.totalDistance;
      
      // Calculate distance from previous point
      if (coordinates.length > 1) {
        const prevCoord = coordinates[coordinates.length - 2];
        const distance = calculateDistance(prevCoord, newCoordinate);
        
        // Only add distance if it's significant (> 1 meter) to filter GPS noise
        if (distance > 1) {
          totalDistance += distance;
        }
      }

      const totalDistanceMiles = totalDistance / METERS_PER_MILE;
      const duration = startTimeRef.current ? (now - startTimeRef.current) / 1000 : 0;
      const averageSpeed = duration > 0 ? totalDistance / duration : 0;
      const currentSpeed = newCoordinate.speed ?? 0;

      return {
        ...prev,
        coordinates,
        totalDistance,
        totalDistanceMiles,
        currentSpeed,
        averageSpeed,
        duration,
        error: undefined,
      };
    });
  }, [updateInterval]);

  // Handle position error
  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Error getting location';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }

    setState((prev) => ({ ...prev, error: errorMessage }));
    console.error('GPS error:', errorMessage, error);
  }, []);

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!isGeolocationSupported) {
      toast.error('Geolocation is not supported');
      return false;
    }

    // Request permission first
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      return false;
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    startTimeRef.current = Date.now();
    lastUpdateTimeRef.current = 0;

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: HIGH_ACCURACY,
        timeout: 30000,
        maximumAge: 0,
      }
    );

    // Update duration every second
    intervalTimerRef.current = setInterval(() => {
      setState((prev) => {
        if (!prev.isTracking || prev.isPaused || !startTimeRef.current) return prev;
        const duration = (Date.now() - startTimeRef.current) / 1000;
        return { ...prev, duration };
      });
    }, 1000);

    setState((prev) => ({
      ...prev,
      isTracking: true,
      isPaused: false,
      startTime: startTimeRef.current,
      error: undefined,
    }));

    toast.success('GPS tracking started');
    return true;
  }, [isGeolocationSupported, requestPermission, handlePosition, handleError]);

  // Pause tracking
  const pauseTracking = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
    toast.info('Tracking paused');
  }, []);

  // Resume tracking
  const resumeTracking = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
    toast.success('Tracking resumed');
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isTracking: false,
      isPaused: false,
    }));

    toast.success('Tracking stopped');
  }, []);

  // Reset tracking data
  const resetTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }

    startTimeRef.current = null;
    lastUpdateTimeRef.current = 0;

    setState({
      isTracking: false,
      isPaused: false,
      coordinates: [],
      totalDistance: 0,
      totalDistanceMiles: 0,
      currentSpeed: 0,
      averageSpeed: 0,
      duration: 0,
      error: undefined,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    isGeolocationSupported,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    resetTracking,
    requestPermission,
  };
};
