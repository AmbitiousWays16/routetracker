import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UserAddress {
  id: string;
  name: string;
  address: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useUserAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('id, user_id, name, address, created_at, updated_at')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setAddresses((data as UserAddress[]) || []);
    } catch (error) {
      console.error('Error fetching user addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addAddress = async (name: string, address: string): Promise<UserAddress | null> => {
    if (!user) {
      toast.error('Please log in to save addresses');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          name: name.trim(),
          address: address.trim(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This address is already saved');
        } else {
          throw error;
        }
        return null;
      }

      const newAddress = data as UserAddress;
      setAddresses((prev) => [...prev, newAddress].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Address saved!');
      return newAddress;
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to save address');
      return null;
    }
  };

  const deleteAddress = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success('Address removed');
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to remove address');
      return false;
    }
  };

  return {
    addresses,
    loading,
    addAddress,
    deleteAddress,
    refetch: fetchAddresses,
  };
};
