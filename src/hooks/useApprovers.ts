import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Approver {
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'supervisor' | 'vp' | 'coo' | 'accountant';
}

export const useApprovers = () => {
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all users with approver roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['supervisor', 'vp', 'coo', 'accountant']);

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setApprovers([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(rolesData.map(r => r.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine roles with profiles
      const approversList: Approver[] = rolesData.map(roleRecord => {
        const profile = profilesData?.find(p => p.user_id === roleRecord.user_id);
        return {
          user_id: roleRecord.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || null,
          role: roleRecord.role as Approver['role'],
        };
      }).filter(a => a.email); // Only include users with email

      setApprovers(approversList);
    } catch (error) {
      console.error('Error fetching approvers:', error);
      toast.error('Failed to load approvers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovers();
  }, [fetchApprovers]);

  const getSupervisors = useCallback(() => {
    return approvers.filter(a => a.role === 'supervisor');
  }, [approvers]);

  const getVPs = useCallback(() => {
    return approvers.filter(a => a.role === 'vp');
  }, [approvers]);

  const getCOOs = useCallback(() => {
    return approvers.filter(a => a.role === 'coo');
  }, [approvers]);

  const getAccountants = useCallback(() => {
    return approvers.filter(a => a.role === 'accountant');
  }, [approvers]);

  const getApproversByRole = useCallback((role: Approver['role']) => {
    return approvers.filter(a => a.role === role);
  }, [approvers]);

  return {
    approvers,
    loading,
    fetchApprovers,
    getSupervisors,
    getVPs,
    getCOOs,
    getAccountants,
    getApproversByRole,
  };
};
