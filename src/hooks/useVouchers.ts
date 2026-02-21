
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  VoucherStatus, 
  MileageVoucherRecord, 
  ApprovalHistoryRecord,
  getNextApproverRole,
  getStatusAfterApproval,
  ApproverRole
} from '@/types/voucher';

export const useVouchers = () => {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<MileageVoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVouchers = useCallback(async () => {
    if (!user) {
      setVouchers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mileage_vouchers')
        .select('id, user_id, month, total_miles, status, submitted_at, current_approver_id, rejection_reason, created_at, updated_at')
        .eq('user_id', user.id)
        .order('month', { ascending: false });

      if (error) throw error;
      setVouchers((data || []) as MileageVoucherRecord[]);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      toast.error('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const getOrCreateVoucher = useCallback(async (month: Date, totalMiles: number): Promise<MileageVoucherRecord | null> => {
    if (!user) return null;

    const monthStr = format(month, 'yyyy-MM-01');
    try {
      // Check if voucher exists
      const { data: existing, error: fetchError } = await supabase
        .from('mileage_vouchers')
        .select('id, user_id, month, total_miles, status, submitted_at, current_approver_id, rejection_reason, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('month', monthStr)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Bug 2 Fix: Use tolerance for floating point comparison
        if (Math.abs(existing.total_miles - totalMiles) > 0.001) {
          const { data: updated, error: updateError } = await supabase
            .from('mileage_vouchers')
            .update({ total_miles: totalMiles })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return updated as MileageVoucherRecord;
        }
        return existing as MileageVoucherRecord;
      }

      // Create new voucher
      const { data: created, error: createError } = await supabase
        .from('mileage_vouchers')
        .insert({
          user_id: user.id,
          month: monthStr,
          total_miles: totalMiles,
          status: 'draft' as VoucherStatus,
        })
        .select()
        .single();

      if (createError) throw createError;
      return created as MileageVoucherRecord;
    } catch (error) {
      console.error('Error getting/creating voucher:', error);
      return null;
    }
  }, [user]);

  const submitVoucher = useCallback(async (
    voucherId: string, 
    supervisorEmail: string,
    employeeName: string,
    month: string,
    totalMiles: number
  ) => {
    if (!user) return false;

    try {
      // Fetch user's profile to get their signature
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('signature_text, signature_type, full_name')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile for signature:', profileError);
      }

      // Update voucher status
      const { error: updateError } = await supabase
        .from('mileage_vouchers')
        .update({ 
          status: 'pending_supervisor' as VoucherStatus,
          submitted_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', voucherId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record employee submission in approval history with their signature
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          voucher_id: voucherId,
          approver_id: user.id,
          approver_role: 'user',
          action: 'approve',
          signature_text: profile?.signature_text || null,
          approver_name: profile?.full_name || employeeName,
          acted_date: new Date().toISOString().split('T')[0],
        });

      if (historyError) {
        console.error('Error recording employee signature:', historyError);
      }

      // Send email notification to supervisor
      const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
        body: {
          voucherId,
          action: 'submit',
          recipientEmail: supervisorEmail,
          employeeName,
          month,
          totalMiles,
        },
      });

      if (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      toast.success('Voucher submitted for approval');
      await fetchVouchers();
      return true;
    } catch (error) {
      console.error('Error submitting voucher:', error);
      toast.error('Failed to submit voucher');
      return false;
    }
  }, [user, fetchVouchers]);

  const getVoucherForMonth = useCallback((month: Date): MileageVoucherRecord | undefined => {
    const monthStr = format(month, 'yyyy-MM-01');
    return vouchers.find(v => v.month === monthStr);
  }, [vouchers]);

  return {
    vouchers,
    loading,
    fetchVouchers,
    getOrCreateVoucher,
    submitVoucher,
    getVoucherForMonth,
  };
};

export const useApproverVouchers = () => {
  const { user } = useAuth();
  const [pendingVouchers, setPendingVouchers] = useState<MileageVoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [approverRole, setApproverRole] = useState<ApproverRole | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 20;

  const fetchApproverRole = useCallback(async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const roles = (data || []).map(r => r.role);
      if (roles.includes('coo')) return 'coo' as ApproverRole;
      if (roles.includes('vp')) return 'vp' as ApproverRole;
      if (roles.includes('supervisor')) return 'supervisor' as ApproverRole;
      return null;
    } catch (error) {
      console.error('Error fetching approver role:', error);
      return null;
    }
  }, [user]);

  // Bug 1 Fix: pageIndex removed from deps to prevent infinite loops
  const fetchPendingVouchers = useCallback(async (reset = false, targetPage?: number) => {
    if (!user) {
      setPendingVouchers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const role = await fetchApproverRole();
      setApproverRole(role);
      
      if (!role) {
        setPendingVouchers([]);
        setLoading(false);
        return;
      }

      const currentPage = targetPage !== undefined ? targetPage : (reset ? 0 : pageIndex);
      
      const statusMap: Record<ApproverRole, VoucherStatus> = {
        supervisor: 'pending_supervisor',
        vp: 'pending_vp',
        coo: 'pending_coo',
        user: 'draft',
      };

      const { data: vouchersData, error: vouchersError } = await supabase
        .from('mileage_vouchers')
        .select('id, user_id, month, total_miles, status, submitted_at, current_approver_id, rejection_reason, created_at, updated_at')
        .eq('status', statusMap[role])
        .order('submitted_at', { ascending: true })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (vouchersError) throw vouchersError;

      const userIds = [...new Set((vouchersData || []).map(v => v.user_id))];
      let profilesMap: Record<string, { email: string | null; full_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = { email: p.email, full_name: p.full_name };
          return acc;
        }, {} as Record<string, { email: string | null; full_name: string | null }>);
      }

      const enrichedVouchers = (vouchersData || []).map(v => ({
        ...v,
        user_email: profilesMap[v.user_id]?.email || null,
        user_full_name: profilesMap[v.user_id]?.full_name || null,
      }));

      setPendingVouchers(enrichedVouchers as MileageVoucherRecord[]);
    } catch (error) {
      console.error('Error fetching pending vouchers:', error);
      toast.error('Failed to load pending vouchers');
    } finally {
      setLoading(false);
    }
  }, [user, fetchApproverRole]); // Removed pageIndex

  useEffect(() => {
    fetchPendingVouchers();
  }, [fetchPendingVouchers]);

  const approveVoucher = useCallback(async (
    voucher: MileageVoucherRecord,
    employeeEmail: string,
    employeeName: string,
    nextApproverEmail?: string,
    accountantEmail?: string,
    signatureText?: string,
    approverNameForSignature?: string
  ) => {
    if (!user || !approverRole) return false;

    try {
      const { data, error } = await supabase.functions.invoke('approve-voucher', {
        body: {
          voucherId: voucher.id,
          signatureText: signatureText || null,
          approverName: approverNameForSignature || null,
          nextApproverEmail: nextApproverEmail || null,
          accountantEmail: accountantEmail || null,
          employeeEmail: employeeEmail || null,
          employeeName: employeeName || null,
        },
      });

      if (error) throw error;
      toast.success('Voucher approved');
      await fetchPendingVouchers();
      return true;
    } catch (error) {
      console.error('Error approving voucher:', error);
      toast.error('Failed to approve voucher');
      return false;
    }
  }, [user, approverRole, fetchPendingVouchers]);

  const rejectVoucher = useCallback(async (
    voucher: MileageVoucherRecord,
    employeeEmail: string,
    employeeName: string,
    reason: string
  ) => {
    if (!user || !approverRole) return false;

    try {
      // Bug 3 Fix: Add ownership scope check
      const statusMap: Record<ApproverRole, VoucherStatus> = {
        supervisor: 'pending_supervisor',
        vp: 'pending_vp',
        coo: 'pending_coo',
        user: 'draft',
      };

      const { error: updateError } = await supabase
        .from('mileage_vouchers')
        .update({ 
          status: 'rejected' as VoucherStatus,
          rejection_reason: reason,
          current_approver_id: null
        })
        .eq('id', voucher.id)
        .eq('status', statusMap[approverRole]);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          voucher_id: voucher.id,
          approver_id: user.id,
          approver_role: approverRole,
          action: 'reject',
          comments: reason,
          acted_date: new Date().toISOString().split('T')[0],
        });

      if (historyError) throw historyError;

      const monthDisplay = format(new Date(voucher.month), 'MMMM yyyy');
      const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
        body: {
          voucherId: voucher.id,
          action: 'reject',
          recipientEmail: employeeEmail,
          employeeName,
          month: monthDisplay,
          totalMiles: voucher.total_miles,
          rejectionReason: reason,
        },
      });

      if (emailError) {
        console.error('Failed to send rejection notification email:', emailError);
      }

      toast.success('Voucher returned to employee');
      await fetchPendingVouchers();
      return true;
    } catch (error) {
      console.error('Error rejecting voucher:', error);
      toast.error('Failed to return voucher');
      return false;
    }
  }, [user, approverRole, fetchPendingVouchers]);

  return {
    pendingVouchers,
    loading,
    approverRole,
    pageIndex,
    pageSize,
    setPageIndex,
    fetchPendingVouchers,
    approveVoucher,
    rejectVoucher,
  };
};
