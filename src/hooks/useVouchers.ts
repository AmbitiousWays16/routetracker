import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  VoucherStatus,
  MileageVoucherRecord,
  getNextApproverRole,
  getStatusAfterApproval,
  ApproverRole,
} from '@/types/voucher';
import { sendVoucherNotification } from '@/lib/emailService';

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
      const q = query(
        collection(db, 'mileage_vouchers'),
        where('user_id', '==', user.uid),
        orderBy('month', 'desc')
      );
      const snapshot = await getDocs(q);
      const data: MileageVoucherRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as MileageVoucherRecord));
      setVouchers(data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      toast.error('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const getOrCreateVoucher = useCallback(async (month: Date, totalMiles: number): Promise<MileageVoucherRecord | null> => {
    if (!user) return null;
    const monthStr = format(month, 'yyyy-MM-01');

    try {
      const q = query(
        collection(db, 'mileage_vouchers'),
        where('user_id', '==', user.uid),
        where('month', '==', monthStr)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existing = snapshot.docs[0];
        const existingData = existing.data() as MileageVoucherRecord;
        if (existingData.total_miles !== totalMiles) {
          await updateDoc(doc(db, 'mileage_vouchers', existing.id), { total_miles: totalMiles });
          return { ...existingData, id: existing.id, total_miles: totalMiles };
        }
        return { ...existingData, id: existing.id };
      }

      const docRef = await addDoc(collection(db, 'mileage_vouchers'), {
        user_id: user.uid,
        month: monthStr,
        total_miles: totalMiles,
        status: 'draft' as VoucherStatus,
        created_at: Timestamp.now(),
      });

      return {
        id: docRef.id,
        user_id: user.uid,
        month: monthStr,
        total_miles: totalMiles,
        status: 'draft' as VoucherStatus,
      } as MileageVoucherRecord;
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
      await updateDoc(doc(db, 'mileage_vouchers', voucherId), {
        status: 'pending_supervisor' as VoucherStatus,
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      });

      // Send email notification to supervisor (fire-and-forget)
      sendVoucherNotification({
        voucherId, action: 'submit', recipientEmail: supervisorEmail,
        employeeName, month, totalMiles,
      });

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
    return vouchers.find((v) => v.month === monthStr);
  }, [vouchers]);

  return { vouchers, loading, fetchVouchers, getOrCreateVoucher, submitVoucher, getVoucherForMonth };
};

export const useApproverVouchers = () => {
  const { user } = useAuth();
  const [pendingVouchers, setPendingVouchers] = useState<MileageVoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [approverRole, setApproverRole] = useState<ApproverRole | null>(null);

  const fetchApproverRole = useCallback(async (): Promise<ApproverRole | null> => {
    if (!user) return null;
    try {
      const q = query(collection(db, 'user_roles'), where('user_id', '==', user.uid));
      const snapshot = await getDocs(q);
      const roles = snapshot.docs.map((d) => d.data().role as string);
      if (roles.includes('coo')) return 'coo';
      if (roles.includes('vp')) return 'vp';
      if (roles.includes('supervisor')) return 'supervisor';
      return null;
    } catch (error) {
      console.error('Error fetching approver role:', error);
      return null;
    }
  }, [user]);

  const fetchPendingVouchers = useCallback(async () => {
    if (!user) { setPendingVouchers([]); setLoading(false); return; }
    try {
      setLoading(true);
      const role = await fetchApproverRole();
      setApproverRole(role);
      if (!role) { setPendingVouchers([]); setLoading(false); return; }

      const statusMap: Record<ApproverRole, VoucherStatus> = {
        supervisor: 'pending_supervisor',
        vp: 'pending_vp',
        coo: 'pending_coo',
      };

      const q = query(
        collection(db, 'mileage_vouchers'),
        where('status', '==', statusMap[role]),
        orderBy('submitted_at', 'asc')
      );
      const snapshot = await getDocs(q);
      setPendingVouchers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MileageVoucherRecord)));
    } catch (error) {
      console.error('Error fetching pending vouchers:', error);
      toast.error('Failed to load pending vouchers');
    } finally {
      setLoading(false);
    }
  }, [user, fetchApproverRole]);

  useEffect(() => { fetchPendingVouchers(); }, [fetchPendingVouchers]);

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
      const monthDisplay = format(new Date(voucher.month), 'MMMM yyyy');

      await updateDoc(doc(db, 'mileage_vouchers', voucher.id), { status: newStatus });

      await addDoc(collection(db, 'approval_history'), {
        voucher_id: voucher.id,
        approver_id: user.uid,
        approver_role: approverRole,
        action: 'approve',
        created_at: Timestamp.now(),
      });

      // Send email notification to next approver or employee (fire-and-forget)
      sendVoucherNotification({
        voucherId: voucher.id, action: 'approve',
        recipientEmail: nextApproverEmail || employeeEmail,
        employeeName, month: monthDisplay,
        totalMiles: voucher.total_miles, nextApproverRole: nextRole ?? undefined,
      });

      if (isFinalApproval && accountantEmail) {
        sendVoucherNotification({
          voucherId: voucher.id, action: 'final_approval',
          recipientEmail: accountantEmail, employeeName,
          month: monthDisplay, totalMiles: voucher.total_miles,
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
      const monthDisplay = format(new Date(voucher.month), 'MMMM yyyy');

      await updateDoc(doc(db, 'mileage_vouchers', voucher.id), {
        status: 'rejected' as VoucherStatus,
        rejection_reason: reason,
      });

      await addDoc(collection(db, 'approval_history'), {
        voucher_id: voucher.id,
        approver_id: user.uid,
        approver_role: approverRole,
        action: 'reject',
        comments: reason,
        created_at: Timestamp.now(),
      });

      // Send email notification to employee (fire-and-forget)
      sendVoucherNotification({
        voucherId: voucher.id, action: 'reject',
        recipientEmail: employeeEmail, employeeName,
        month: monthDisplay, totalMiles: voucher.total_miles, rejectionReason: reason,
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

  return { pendingVouchers, loading, approverRole, fetchPendingVouchers, approveVoucher, rejectVoucher };
};
