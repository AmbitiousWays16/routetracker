export type VoucherStatus = 
  | 'draft'
  | 'pending_supervisor'
  | 'pending_vp'
  | 'pending_coo'
  | 'approved'
  | 'rejected';

export type ApprovalAction = 'approve' | 'reject';

export type ApproverRole = 'supervisor' | 'vp' | 'coo' | 'user';

export interface MileageVoucherRecord {
  id: string;
  user_id: string;
  month: string;
  total_miles: number;
  status: VoucherStatus;
  submitted_at: string | null;
  current_approver_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalHistoryRecord {
  id: string;
  voucher_id: string;
  approver_id: string;
  approver_role: ApproverRole;
  action: ApprovalAction;
  comments: string | null;
  signature_text: string | null;
  approver_name: string | null;
  acted_date: string;
}

export interface VoucherWithDetails extends MileageVoucherRecord {
  employee_email?: string;
  employee_name?: string;
  approval_history?: ApprovalHistoryRecord[];
}

export const APPROVAL_CHAIN: ApproverRole[] = ['supervisor', 'vp', 'coo'];

export const getNextApproverRole = (currentStatus: VoucherStatus): ApproverRole | null => {
  if (currentStatus === 'draft' || currentStatus === 'rejected') {
    return 'supervisor';
  }
  if (currentStatus === 'pending_supervisor') {
    return 'vp';
  }
  if (currentStatus === 'pending_vp') {
    return 'coo';
  }
  return null;
};

export const getStatusAfterApproval = (currentRole: ApproverRole): VoucherStatus => {
  if (currentRole === 'supervisor') {
    return 'pending_vp';
  }
  if (currentRole === 'vp') {
    return 'pending_coo';
  }
  if (currentRole === 'coo') {
    return 'approved';
  }
  // Bug 6 Fix: Handle 'user' role or any other fallback safely
  return 'pending_supervisor';
};

export const getStatusDisplayName = (status: VoucherStatus): string => {
  const displayNames: Record<VoucherStatus, string> = {
    draft: 'Draft',
    pending_supervisor: 'Pending Supervisor',
    pending_vp: 'Pending VP',
    pending_coo: 'Pending COO',
    approved: 'Approved',
    rejected: 'Returned for Corrections',
  };
  return displayNames[status];
};

export const getRoleDisplayName = (role: ApproverRole): string => {
  const displayNames: Record<string, string> = {
    supervisor: 'Supervisor',
    vp: 'Vice President',
    coo: 'Chief Operations Officer',
    user: 'Employee',
  };
  return displayNames[role] || role;
};
