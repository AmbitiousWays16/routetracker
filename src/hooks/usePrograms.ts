import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Program {
  id: string;
  name: string;
  address: string;
}

export const usePrograms = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  }, [user]);

  const fetchPrograms = useCallback(async () => {
    try {
      // Fetch all programs (shared for all users)
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedPrograms: Program[] = (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
      }));

      setPrograms(formattedPrograms);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Separate effect for admin status that re-runs when user changes
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus, user]);

  const addProgram = useCallback(async (name: string, address: string = ''): Promise<Program | null> => {
    if (!user) {
      toast.error('You must be logged in to add programs');
      return null;
    }

    if (!isAdmin) {
      toast.error('Only admins can add programs');
      return null;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Program name cannot be empty');
      return null;
    }

    // Check for duplicate names
    const duplicate = programs.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      toast.error('A program with this name already exists');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          user_id: user.id,
          name: trimmedName,
          address: address.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const newProgram: Program = {
        id: data.id,
        name: data.name,
        address: data.address,
      };

      setPrograms((prev) => [...prev, newProgram].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Program added successfully');
      return newProgram;
    } catch (error) {
      console.error('Error adding program:', error);
      toast.error('Failed to add program');
      return null;
    }
  }, [user, programs, isAdmin]);

  const updateProgram = useCallback(async (id: string, updates: { name?: string; address?: string }): Promise<boolean> => {
    if (!user) return false;

    if (!isAdmin) {
      toast.error('Only admins can update programs');
      return false;
    }

    const trimmedName = updates.name?.trim();

    // Check for duplicate names if name is being updated
    if (trimmedName) {
      const duplicate = programs.find(
        (p) => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        toast.error('A program with this name already exists');
        return false;
      }
    }

    try {
      const dbUpdates: Record<string, string> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
      if (updates.address !== undefined) dbUpdates.address = updates.address.trim();

      const { error } = await supabase
        .from('programs')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setPrograms((prev) =>
        prev
          .map((p) => (p.id === id ? { ...p, ...updates } : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      toast.success('Program updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error('Failed to update program');
      return false;
    }
  }, [user, programs, isAdmin]);

  const deleteProgram = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    if (!isAdmin) {
      toast.error('Only admins can delete programs');
      return false;
    }

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrograms((prev) => prev.filter((p) => p.id !== id));
      toast.success('Program deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error('Failed to delete program');
      return false;
    }
  }, [user, isAdmin]);

  return {
    programs,
    loading,
    isAdmin,
    addProgram,
    updateProgram,
    deleteProgram,
    refetch: fetchPrograms,
  };
};
