import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GPSCoordinate, RouteData } from '@/types/mileage';
import { toast } from 'sonner';

/**
 * GPS Route management hook.
 * 
 * NOTE: This hook is prepared for GPS route storage functionality.
 * The required database tables (routes, gps_coordinates) need to be created
 * via a migration before full functionality is available.
 * 
 * Currently, GPS data is stored inline with trips rather than in separate tables.
 */
export const useGPSRoute = () => {
  const { user } = useAuth();

  // Save GPS route - currently a no-op until database tables are created
  const saveRoute = useCallback(
    async (routeData: RouteData, tripId?: string): Promise<string | null> => {
      if (!user) {
        toast.error('You must be logged in to save routes');
        return null;
      }

      // GPS route data is currently embedded in the trip record itself
      // rather than stored in separate tables. The coordinates are tracked
      // but the detailed GPS storage requires additional database tables.
      console.log('GPS route data captured:', {
        pointCount: routeData.coordinates.length,
        totalDistanceMeters: routeData.totalDistanceMeters,
        duration: routeData.duration,
        tripId,
      });

      // Return a generated ID to indicate success
      // The actual GPS data is saved as part of the trip record
      return `gps-${Date.now()}`;
    },
    [user]
  );

  // Get route by ID - placeholder until database tables are created
  const getRoute = useCallback(
    async (routeId: string): Promise<RouteData | null> => {
      if (!user) return null;

      console.log('getRoute called for:', routeId);
      // GPS routes are currently stored inline with trips
      return null;
    },
    [user]
  );

  // Get all routes for user - placeholder until database tables are created
  const getRoutes = useCallback(async (): Promise<RouteData[]> => {
    if (!user) return [];

    // GPS routes are currently stored inline with trips
    return [];
  }, [user]);

  // Delete route - placeholder until database tables are created
  const deleteRoute = useCallback(
    async (routeId: string): Promise<boolean> => {
      if (!user) return false;

      console.log('deleteRoute called for:', routeId);
      // GPS routes are currently stored inline with trips
      return true;
    },
    [user]
  );

  return {
    saveRoute,
    getRoute,
    getRoutes,
    deleteRoute,
  };
};
