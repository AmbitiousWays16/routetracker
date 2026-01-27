import { useState, useCallback, useEffect } from 'react';
import { Trip, RouteMapData } from '@/types/mileage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format, isSameMonth } from 'date-fns';

export const useTrips = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const fetchTrips = useCallback(async (monthDate: Date = selectedMonth) => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get month boundaries for the selected month
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedTrips: Trip[] = (data || []).map((trip) => {
        // Parse routeMapData from static_map_url if it's stored as JSON
        let routeMapData: RouteMapData | undefined;
        if (trip.static_map_url) {
          try {
            const parsed = JSON.parse(trip.static_map_url);
            if (parsed.encodedPolyline) {
              routeMapData = parsed;
            }
          } catch {
            // Not JSON - this is a legacy URL, ignore it
          }
        }

        return {
          id: trip.id,
          date: trip.date,
          fromAddress: trip.from_address,
          toAddress: trip.to_address,
          program: trip.program,
          businessPurpose: trip.purpose,
          miles: Number(trip.miles),
          routeUrl: trip.route_url || undefined,
          routeMapData,
          createdAt: new Date(trip.created_at),
        };
      });

      setTrips(formattedTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonth]);

  useEffect(() => {
    fetchTrips(selectedMonth);
  }, [selectedMonth, user]);

  const changeMonth = useCallback((newMonth: Date) => {
    setSelectedMonth(newMonth);
  }, []);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  const addTrip = useCallback(async (trip: Omit<Trip, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error('You must be logged in to add trips');
      return null;
    }

    try {
      // Store routeMapData as JSON string in static_map_url field (repurposed)
      const staticMapUrlValue = trip.routeMapData 
        ? JSON.stringify(trip.routeMapData) 
        : null;

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          date: trip.date,
          from_address: trip.fromAddress,
          to_address: trip.toAddress,
          program: trip.program,
          purpose: trip.businessPurpose,
          miles: trip.miles,
          route_url: trip.routeUrl || null,
          static_map_url: staticMapUrlValue,
        })
        .select()
        .single();

      if (error) throw error;

      // Parse routeMapData from the stored JSON
      let routeMapData: RouteMapData | undefined;
      if (data.static_map_url) {
        try {
          const parsed = JSON.parse(data.static_map_url);
          if (parsed.encodedPolyline) {
            routeMapData = parsed;
          }
        } catch {
          // Not JSON - ignore
        }
      }

      const newTrip: Trip = {
        id: data.id,
        date: data.date,
        fromAddress: data.from_address,
        toAddress: data.to_address,
        program: data.program,
        businessPurpose: data.purpose,
        miles: Number(data.miles),
        routeUrl: data.route_url || undefined,
        routeMapData,
        createdAt: new Date(data.created_at),
      };

      // Only add to local state if viewing current month
      if (isCurrentMonth) {
        setTrips((prev) => [newTrip, ...prev]);
      }
      return newTrip;
    } catch (error) {
      console.error('Error adding trip:', error);
      toast.error('Failed to add trip');
      return null;
    }
  }, [user, isCurrentMonth]);

  const deleteTrip = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    }
  }, [user]);

  const updateTrip = useCallback(async (id: string, updates: Partial<Trip>) => {
    if (!user) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.fromAddress !== undefined) dbUpdates.from_address = updates.fromAddress;
      if (updates.toAddress !== undefined) dbUpdates.to_address = updates.toAddress;
      if (updates.program !== undefined) dbUpdates.program = updates.program;
      if (updates.businessPurpose !== undefined) dbUpdates.purpose = updates.businessPurpose;
      if (updates.miles !== undefined) dbUpdates.miles = updates.miles;
      if (updates.routeUrl !== undefined) dbUpdates.route_url = updates.routeUrl;
      if (updates.routeMapData !== undefined) {
        dbUpdates.static_map_url = updates.routeMapData 
          ? JSON.stringify(updates.routeMapData) 
          : null;
      }

      const { error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrips((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    } catch (error) {
      console.error('Error updating trip:', error);
      toast.error('Failed to update trip');
    }
  }, [user]);

  const clearTrips = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setTrips([]);
      toast.success('All trips cleared');
    } catch (error) {
      console.error('Error clearing trips:', error);
      toast.error('Failed to clear trips');
    }
  }, [user]);

  const totalMiles = trips.reduce((sum, t) => sum + t.miles, 0);

  return {
    trips,
    loading,
    addTrip,
    deleteTrip,
    updateTrip,
    clearTrips,
    totalMiles,
    refetch: fetchTrips,
    selectedMonth,
    changeMonth,
    isCurrentMonth,
  };
};
