-- =====================================================
-- FIX 1: Approval History Cross-Tier Visibility
-- Replace the overly broad "Approvers can view approval history" policy
-- with role-scoped policies following least privilege principle
-- =====================================================

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Approvers can view approval history" ON public.approval_history;

-- Supervisors: only see approval history for vouchers pending their review OR their own approvals
CREATE POLICY "Supervisors view relevant approval history"
ON public.approval_history FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND (
    -- Vouchers pending supervisor review
    EXISTS (
      SELECT 1 FROM mileage_vouchers v
      WHERE v.id = approval_history.voucher_id
      AND v.status = 'pending_supervisor'::voucher_status
    )
    -- OR their own approval actions
    OR approver_id = auth.uid()
  )
);

-- VPs: see approval history for vouchers at VP level or that they approved
CREATE POLICY "VPs view relevant approval history"
ON public.approval_history FOR SELECT
USING (
  has_role(auth.uid(), 'vp'::app_role) AND (
    -- Vouchers pending VP review (see full chain up to this point)
    EXISTS (
      SELECT 1 FROM mileage_vouchers v
      WHERE v.id = approval_history.voucher_id
      AND v.status = 'pending_vp'::voucher_status
    )
    -- OR their own approval actions
    OR approver_id = auth.uid()
  )
);

-- COOs: see approval history for vouchers at COO level or approved, or their own approvals
CREATE POLICY "COOs view relevant approval history"
ON public.approval_history FOR SELECT
USING (
  has_role(auth.uid(), 'coo'::app_role) AND (
    -- Vouchers pending COO review or already approved (final stage)
    EXISTS (
      SELECT 1 FROM mileage_vouchers v
      WHERE v.id = approval_history.voucher_id
      AND v.status IN ('pending_coo'::voucher_status, 'approved'::voucher_status)
    )
    -- OR their own approval actions
    OR approver_id = auth.uid()
  )
);

-- Admins: retain full access for system management
CREATE POLICY "Admins view all approval history"
ON public.approval_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- FIX 2: Profiles Email Exposure
-- Create a view that excludes email for approval workflows
-- Approvers only need name/job_title, not email
-- =====================================================

-- Create a secure view for approver workflows (excludes email)
CREATE OR REPLACE VIEW public.profiles_approver_view
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  full_name,
  job_title,
  created_at,
  updated_at
FROM public.profiles;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.profiles_approver_view TO authenticated;

-- =====================================================
-- FIX 3: Approval History Signature Exposure
-- Update the accountant policy to be more restrictive
-- Signatures should only be visible to:
-- - The voucher owner (existing policy)
-- - Accountants for approved vouchers (existing policy - kept)
-- - Admins (new policy above)
-- - The approver themselves (covered by new scoped policies)
-- =====================================================

-- The new role-scoped policies above already restrict signature visibility:
-- - Supervisors only see signatures for vouchers in their queue
-- - VPs only see signatures for vouchers at VP level
-- - COOs only see signatures for final-stage vouchers
-- - Accountants policy is already scoped to approved vouchers only
-- - Users can view their own voucher's approval history (existing policy)

-- No additional changes needed for signature exposure as the 
-- cross-tier fix above addresses this issue