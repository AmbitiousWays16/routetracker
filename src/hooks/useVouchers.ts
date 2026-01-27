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
        .select('*')
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
        .select('*')
        .eq('user_id', user.id)
        .eq('month', monthStr)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Update total miles if changed
        if (existing.total_miles !== totalMiles) {
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
        // Don't fail the submission if email fails
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

  const fetchApproverRole = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      // Check for approver roles in order of precedence
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

  const fetchPendingVouchers = useCallback(async () => {
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

      const statusMap: Record<ApproverRole, VoucherStatus> = {
        supervisor: 'pending_supervisor',
        vp: 'pending_vp',
        coo: 'pending_coo',
      };

      const { data, error } = await supabase
        .from('mileage_vouchers')
        .select('*')
        .eq('status', statusMap[role])
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      setPendingVouchers((data || []) as MileageVoucherRecord[]);
    } catch (error) {
      console.error('Error fetching pending vouchers:', error);
      toast.error('Failed to load pending vouchers');
    } finally {
      setLoading(false);
    }
  }, [user, fetchApproverRole]);

  useEffect(() => {
    fetchPendingVouchers();
  }, [fetchPendingVouchers]);

  const approveVoucher = useCallback(async (
    voucher: MileageVoucherRecord,
    employeeEmail: string,
    employeeName: string,
    nextApproverEmail?: string,
    accountantEmail?: string
  ) => {
    if (!user || !approverRole) return false;

    try {
      const newStatus = getStatusAfterApproval(approverRole);
      const nextRole = getNextApproverRole(newStatus);
      const isFinalApproval = newStatus === 'approved';

      // Update voucher status
      const { error: updateError } = await supabase
        .from('mileage_vouchers')
        .update({ status: newStatus })
        .eq('id', voucher.id);

      if (updateError) throw updateError;

      // Record approval in history
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          voucher_id: voucher.id,
          approver_id: user.id,
          approver_role: approverRole,
          action: 'approve',
        });

      if (historyError) throw historyError;

      // Send notification email to next approver or employee
      const notificationEmail = nextApproverEmail || employeeEmail;
      const monthDisplay = format(new Date(voucher.month), 'MMMM yyyy');

      await supabase.functions.invoke('send-approval-email', {
        body: {
          voucherId: voucher.id,
          action: 'approve',
          recipientEmail: notificationEmail,
          employeeName,
          month: monthDisplay,
          totalMiles: voucher.total_miles,
          nextApproverRole: nextRole,
        },
      });

      // If final approval, also notify accountant
      if (isFinalApproval && accountantEmail) {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            voucherId: voucher.id,
            action: 'final_approval',
            recipientEmail: accountantEmail,
            employeeName,
            month: monthDisplay,
            totalMiles: voucher.total_miles,
          },
        });
      }

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
      // Update voucher status
      const { error: updateError } = await supabase
        .from('mileage_vouchers')
        .update({ 
          status: 'rejected' as VoucherStatus,
          rejection_reason: reason
        })
        .eq('id', voucher.id);

      if (updateError) throw updateError;

      // Record rejection in history (reason stored on mileage_vouchers.rejection_reason)
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          voucher_id: voucher.id,
          approver_id: user.id,
          approver_role: approverRole,
          action: 'reject',
        });

      if (historyError) throw historyError;

      // Send notification email to employee
      const monthDisplay = format(new Date(voucher.month), 'MMMM yyyy');

      await supabase.functions.invoke('send-approval-email', {
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
    fetchPendingVouchers,
    approveVoucher,
    rejectVoucher,
  };
};
