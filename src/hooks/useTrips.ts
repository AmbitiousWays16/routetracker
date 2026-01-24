import { useState, useCallback } from 'react';
import { Trip } from '@/types/mileage';

const STORAGE_KEY = 'mileage-trips';

const loadTrips = (): Trip[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveTrips = (trips: Trip[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
};

export const useTrips = () => {
  const [trips, setTrips] = useState<Trip[]>(loadTrips);

  const addTrip = useCallback((trip: Omit<Trip, 'id' | 'createdAt'>) => {
    const newTrip: Trip = {
      ...trip,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setTrips((prev) => {
      const updated = [...prev, newTrip];
      saveTrips(updated);
      return updated;
    });
    return newTrip;
  }, []);

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTrips(updated);
      return updated;
    });
  }, []);

  const updateTrip = useCallback((id: string, updates: Partial<Trip>) => {
    setTrips((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveTrips(updated);
      return updated;
    });
  }, []);

  const clearTrips = useCallback(() => {
    setTrips([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const totalMiles = trips.reduce((sum, t) => sum + t.miles, 0);

  return {
    trips,
    addTrip,
    deleteTrip,
    updateTrip,
    clearTrips,
    totalMiles,
  };
};
