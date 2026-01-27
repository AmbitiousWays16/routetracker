import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface UserWithRoles {
  userId: string;
  email: string | null;
  roles: AppRole[];
}

export const useUserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      const adminStatus = !!data;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      return false;
    }
  }, [user]);

  const fetchUsers = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all profiles (admin can see all via RLS)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch all roles (admin can see all via RLS)
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map profiles with their roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        userId: profile.user_id,
        email: profile.email,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      const adminStatus = await checkAdminStatus();
      if (adminStatus) {
        await fetchUsers();
      } else {
        setLoading(false);
      }
    };
    init();
  }, [checkAdminStatus, fetchUsers]);

  const assignRole = useCallback(async (userId: string, role: AppRole): Promise<boolean> => {
    if (!user || !isAdmin) {
      toast.error('Only admins can assign roles');
      return false;
    }

    // Don't allow assigning admin role
    if (role === 'admin') {
      toast.error('Cannot assign admin role');
      return false;
    }

    // Don't allow assigning user role (it's the default, not stored)
    if (role === 'user') {
      toast.error('User role is default and cannot be assigned');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this role');
          return false;
        }
        throw error;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, roles: [...u.roles, role] }
            : u
        )
      );

      toast.success('Role assigned successfully');
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
      return false;
    }
  }, [user, isAdmin]);

  const removeRole = useCallback(async (userId: string, role: AppRole): Promise<boolean> => {
    if (!user || !isAdmin) {
      toast.error('Only admins can remove roles');
      return false;
    }

    // Don't allow removing admin role
    if (role === 'admin') {
      toast.error('Cannot remove admin role');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, roles: u.roles.filter((r) => r !== role) }
            : u
        )
      );

      toast.success('Role removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
      return false;
    }
  }, [user, isAdmin]);

  return {
    users,
    loading,
    isAdmin,
    assignRole,
    removeRole,
    refetch: fetchUsers,
  };
};
