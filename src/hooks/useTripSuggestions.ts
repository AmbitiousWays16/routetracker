import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';

export interface TripSuggestion {
  fromAddress: string;
  toAddress: string;
  businessPurpose: string;
}

export const useTripSuggestions = () => {
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const url = import.meta.env.VITE_TRIP_SUGGESTIONS_URL;
    if (!url) return;

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const raw: unknown = data.suggestions;
      if (Array.isArray(raw)) {
        setSuggestions(
          (raw as TripSuggestion[]).filter(
            (s) =>
              s &&
              typeof s.fromAddress === 'string' &&
              typeof s.toAddress === 'string' &&
              typeof s.businessPurpose === 'string'
          ).slice(0, 3)
        );
      }
    } catch {
      // Suggestions are best-effort; silently ignore errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return { suggestions, loading, refetch: fetchSuggestions };
};
