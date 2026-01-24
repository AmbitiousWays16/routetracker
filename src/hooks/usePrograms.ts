import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Program {
  id: string;
  name: string;
  address: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PROGRAMS = [
  { name: 'General Business', address: '' },
  { name: 'Client Visit', address: '' },
  { name: 'Training', address: '' },
  { name: 'Conference', address: '' },
  { name: 'Delivery', address: '' },
  { name: 'Site Inspection', address: '' },
  { name: 'Other', address: '' },
];

export const usePrograms = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = useCallback(async () => {
    if (!user) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      // If no programs exist, create defaults
      if (!data || data.length === 0) {
        const defaultsToInsert = DEFAULT_PROGRAMS.map((p) => ({
          name: p.name,
          address: p.address,
          user_id: user.id,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('programs')
          .insert(defaultsToInsert)
          .select();

        if (insertError) throw insertError;
        setPrograms(inserted || []);
      } else {
        setPrograms(data);
      }
    } catch (error: any) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const addProgram = async (name: string, address: string = '') => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('programs')
        .insert({ name: name.trim(), address: address.trim(), user_id: user.id })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('A program with this name already exists');
        } else {
          throw error;
        }
        return null;
      }

      setPrograms((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Program added');
      return data;
    } catch (error: any) {
      console.error('Error adding program:', error);
      toast.error('Failed to add program');
      return null;
    }
  };

  const updateProgram = async (id: string, updates: { name?: string; address?: string }) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('programs')
        .update({
          ...(updates.name && { name: updates.name.trim() }),
          ...(updates.address !== undefined && { address: updates.address.trim() }),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('A program with this name already exists');
        } else {
          throw error;
        }
        return false;
      }

      setPrograms((prev) =>
        prev
          .map((p) =>
            p.id === id
              ? { ...p, ...updates, name: updates.name?.trim() ?? p.name, address: updates.address?.trim() ?? p.address }
              : p
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success('Program updated');
      return true;
    } catch (error: any) {
      console.error('Error updating program:', error);
      toast.error('Failed to update program');
      return false;
    }
  };

  const deleteProgram = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setPrograms((prev) => prev.filter((p) => p.id !== id));
      toast.success('Program deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting program:', error);
      toast.error('Failed to delete program');
      return false;
    }
  };

  return {
    programs,
    loading,
    addProgram,
    updateProgram,
    deleteProgram,
    refetch: fetchPrograms,
  };
};
