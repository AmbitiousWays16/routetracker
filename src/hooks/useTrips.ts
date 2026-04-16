import { useState, useCallback, useEffect } from 'react';
import { Trip, RouteMapData } from '@/types/mileage';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
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
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const q = query(
        collection(db, 'trips'),
        where('user_id', '==', user.uid),
        where('date', '>=', monthStart),
        where('date', '<=', monthEnd),
        orderBy('date', 'asc')
      );

      const snapshot = await getDocs(q);

      const formattedTrips: Trip[] = snapshot.docs.map((docSnap) => {
        const trip = docSnap.data();
        let routeMapData: RouteMapData | undefined;
        if (trip.static_map_url) {
          try {
            const parsed = JSON.parse(trip.static_map_url);
            if (parsed.encodedPolyline) routeMapData = parsed;
          } catch {
            // legacy URL, ignore
          }
        }
        return {
          id: docSnap.id,
          date: trip.date,
          fromAddress: trip.from_address,
          toAddress: trip.to_address,
          program: trip.program,
          businessPurpose: trip.purpose,
          miles: Number(trip.miles),
          routeUrl: trip.route_url || undefined,
          routeMapData,
          createdAt: trip.created_at?.toDate ? trip.created_at.toDate() : new Date(trip.created_at),
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
  }, [selectedMonth, user, fetchTrips]);

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
      const staticMapUrlValue = trip.routeMapData
        ? JSON.stringify(trip.routeMapData)
        : null;

      const docRef = await addDoc(collection(db, 'trips'), {
        user_id: user.uid,
        date: trip.date,
        from_address: trip.fromAddress,
        to_address: trip.toAddress,
        program: trip.program,
        purpose: trip.businessPurpose,
        miles: trip.miles,
        route_url: trip.routeUrl || null,
        static_map_url: staticMapUrlValue,
        created_at: Timestamp.now(),
      });

      const newTrip: Trip = {
        id: docRef.id,
        date: trip.date,
        fromAddress: trip.fromAddress,
        toAddress: trip.toAddress,
        program: trip.program,
        businessPurpose: trip.businessPurpose,
        miles: trip.miles,
        routeUrl: trip.routeUrl,
        routeMapData: trip.routeMapData,
        createdAt: new Date(),
      };

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
      await deleteDoc(doc(db, 'trips', id));
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

      await updateDoc(doc(db, 'trips', id), dbUpdates);
      setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    } catch (error) {
      console.error('Error updating trip:', error);
      toast.error('Failed to update trip');
    }
  }, [user]);

  const clearTrips = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'trips'), where('user_id', '==', user.uid));
      const snapshot = await getDocs(q);
      await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
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
