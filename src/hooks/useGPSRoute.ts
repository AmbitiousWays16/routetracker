import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GPSCoordinate, RouteData } from '@/types/mileage';
import { toast } from 'sonner';

export const useGPSRoute = () => {
  const { user } = useAuth();

  // Save GPS route to database
  const saveRoute = useCallback(
    async (routeData: RouteData, tripId?: string): Promise<string | null> => {
      if (!user) {
        toast.error('You must be logged in to save routes');
        return null;
      }

      try {
        // 1. Create route record
        const { data: route, error: routeError } = await supabase
          .from('routes')
          .insert({
            user_id: user.id,
            trip_id: tripId || null,
            route_name: `Route ${new Date(routeData.startTime).toLocaleString()}`,
            total_distance_meters: routeData.totalDistanceMeters,
            actual_duration_seconds: routeData.duration,
            start_lat: routeData.coordinates[0]?.latitude,
            start_lng: routeData.coordinates[0]?.longitude,
            end_lat: routeData.coordinates[routeData.coordinates.length - 1]?.latitude,
            end_lng: routeData.coordinates[routeData.coordinates.length - 1]?.longitude,
            is_verified: true,
          })
          .select()
          .single();

        if (routeError) throw routeError;

        // 2. Save GPS coordinates in batches for better performance
        const BATCH_SIZE = 100;
        const coordinateBatches: GPSCoordinate[][] = [];
        
        for (let i = 0; i < routeData.coordinates.length; i += BATCH_SIZE) {
          coordinateBatches.push(routeData.coordinates.slice(i, i + BATCH_SIZE));
        }

        for (const [batchIndex, batch] of coordinateBatches.entries()) {
          const gpsRecords = batch.map((coord, index) => ({
            route_id: route.id,
            latitude: coord.latitude,
            longitude: coord.longitude,
            altitude_meters: coord.altitude,
            accuracy_meters: coord.accuracy,
            heading_degrees: coord.heading,
            speed_mps: coord.speed,
            sequence_number: batchIndex * BATCH_SIZE + index + 1,
            recorded_at: new Date(coord.timestamp).toISOString(),
            source: 'gps' as const,
          }));

          const { error: gpsError } = await supabase
            .from('gps_coordinates')
            .insert(gpsRecords);

          if (gpsError) {
            console.error('Error saving GPS coordinates batch:', gpsError);
            // Continue with other batches even if one fails
          }
        }

        toast.success('Route saved successfully!');
        return route.id;
      } catch (error) {
        console.error('Error saving route:', error);
        toast.error('Failed to save route data');
        return null;
      }
    },
    [user]
  );

  // Get route by ID with GPS coordinates
  const getRoute = useCallback(
    async (routeId: string): Promise<RouteData | null> => {
      if (!user) return null;

      try {
        // Fetch route metadata
        const { data: route, error: routeError } = await supabase
          .from('routes')
          .select('*')
          .eq('id', routeId)
          .eq('user_id', user.id)
          .single();

        if (routeError) throw routeError;

        // Fetch GPS coordinates
        const { data: coords, error: coordsError } = await supabase
          .from('gps_coordinates')
          .select('*')
          .eq('route_id', routeId)
          .order('sequence_number', { ascending: true });

        if (coordsError) throw coordsError;

        const coordinates: GPSCoordinate[] = coords.map((c) => ({
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
          altitude: c.altitude_meters ? Number(c.altitude_meters) : undefined,
          accuracy: c.accuracy_meters ? Number(c.accuracy_meters) : undefined,
          heading: c.heading_degrees ? Number(c.heading_degrees) : undefined,
          speed: c.speed_mps ? Number(c.speed_mps) : undefined,
          timestamp: new Date(c.recorded_at).getTime(),
        }));

        return {
          routeId: route.id,
          coordinates,
          totalDistanceMeters: Number(route.total_distance_meters),
          totalDistanceMiles: Number(route.total_distance_miles),
          startTime: new Date(route.created_at).getTime(),
          endTime: new Date(route.updated_at).getTime(),
          duration: route.actual_duration_seconds || 0,
        };
      } catch (error) {
        console.error('Error fetching route:', error);
        toast.error('Failed to load route data');
        return null;
      }
    },
    [user]
  );

  // Get all routes for user
  const getRoutes = useCallback(async (): Promise<RouteData[]> => {
    if (!user) return [];

    try {
      const { data: routes, error } = await supabase
        .from('routes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return routes.map((route) => ({
        routeId: route.id,
        coordinates: [], // Don't load full coordinates in list view
        totalDistanceMeters: Number(route.total_distance_meters),
        totalDistanceMiles: Number(route.total_distance_miles),
        startTime: new Date(route.created_at).getTime(),
        endTime: new Date(route.updated_at).getTime(),
        duration: route.actual_duration_seconds || 0,
      }));
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Failed to load routes');
      return [];
    }
  }, [user]);

  // Delete route
  const deleteRoute = useCallback(
    async (routeId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from('routes')
          .delete()
          .eq('id', routeId)
          .eq('user_id', user.id);

        if (error) throw error;

        toast.success('Route deleted');
        return true;
      } catch (error) {
        console.error('Error deleting route:', error);
        toast.error('Failed to delete route');
        return false;
      }
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
