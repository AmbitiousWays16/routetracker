import { useState, useCallback, useEffect } from 'react';
import { Trip, RouteMapData } from '@/types/mileage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format, isSameMonth, getDate, isAfter, addMonths } from 'date-fns';
import { markStart, markEnd } from '@/lib/performance';

// Helper function: Check if a month can be edited
// Allows editing current month OR previous month if current date is before the 10th
export const canEditMonth = (monthDate: Date): boolean => {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const selectedMonthStart = startOfMonth(monthDate);

  // Can always edit current month
  if (isSameMonth(monthDate, today)) {
    return true;
  }

  // Can edit previous month only if today is before the 10th of current month
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  if (isSameMonth(monthDate, previousMonth) && getDate(today) < 10) {
    return true;
  }

  return false;
};

export const useTrips = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Bug 1 Fix: fetchTrips stable callback
  const fetchTrips = useCallback(async (monthDate: Date) => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    try {
      markStart('fetchTrips');
      setLoading(true);
      
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
        let routeMapData: RouteMapData | undefined;
        if (trip.static_map_url) {
          try {
            const parsed = JSON.parse(trip.static_map_url);
            if (parsed.encodedPolyline) {
              routeMapData = parsed;
            }
          } catch {
            // Not JSON
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
      markEnd('fetchTrips');
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips(selectedMonth);
  }, [selectedMonth, user, fetchTrips]);

  const changeMonth = useCallback((newMonth: Date) => {
    setSelectedMonth(newMonth);
  }, []);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());
  const canEdit = canEditMonth(selectedMonth);

  const addTrip = useCallback(async (trip: Omit<Trip, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error('You must be logged in to add trips');
      return null;
    }

    try {
      const staticMapUrlValue = trip.routeMapData ? JSON.stringify(trip.routeMapData) : null;
      
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

      const newTrip: Trip = {
        id: data.id,
        date: data.date,
        fromAddress: data.from_address,
        toAddress: data.to_address,
        program: data.program,
        businessPurpose: data.purpose,
        miles: Number(data.miles),
        routeUrl: data.route_url || undefined,
        routeMapData: trip.routeMapData,
        createdAt: new Date(data.created_at),
      };

      if (canEdit) {
        setTrips((prev) => [newTrip, ...prev]);
      }
      return newTrip;
    } catch (error) {
      console.error('Error adding trip:', error);
      toast.error('Failed to add trip');
      return null;
    }
  }, [user, canEdit]);

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
      const dbUpdates: Record<string, any> = {};
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.fromAddress !== undefined) dbUpdates.from_address = updates.fromAddress;
      if (updates.toAddress !== undefined) dbUpdates.to_address = updates.toAddress;
      if (updates.program !== undefined) dbUpdates.program = updates.program;
      if (updates.businessPurpose !== undefined) dbUpdates.purpose = updates.businessPurpose;
      if (updates.miles !== undefined) dbUpdates.miles = updates.miles;
      if (updates.routeUrl !== undefined) dbUpdates.route_url = updates.routeUrl;
      if (updates.routeMapData !== undefined) {
        dbUpdates.static_map_url = updates.routeMapData ? JSON.stringify(updates.routeMapData) : null;
      }

      const { error } = await supabase
        .from('trips')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
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

  // Fix Bug 7: Precision in mileage calculation
  const totalMiles = Math.round(trips.reduce((sum, t) => sum + Number(t.miles || 0), 0) * 10) / 10;

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
    canEdit,
  };
};
