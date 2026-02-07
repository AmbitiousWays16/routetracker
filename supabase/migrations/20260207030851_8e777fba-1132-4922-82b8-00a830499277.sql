-- Grant necessary table permissions to authenticated role
-- These are required for RLS policies to work properly

-- mileage_vouchers: users need SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON public.mileage_vouchers TO authenticated;

-- approval_history: users need SELECT, INSERT
GRANT SELECT, INSERT ON public.approval_history TO authenticated;

-- profiles: users need SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- user_roles: users need SELECT
GRANT SELECT ON public.user_roles TO authenticated;

-- programs: users need SELECT, INSERT, UPDATE, DELETE (admin-only write via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;

-- trips: users need SELECT, INSERT, UPDATE, DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;

-- user_addresses: users need SELECT, INSERT, UPDATE, DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;

-- Fix the supervisor UPDATE policy - the WITH CHECK clause needs to also allow setting current_approver_id
-- Drop and recreate the supervisor update policy with correct logic
DROP POLICY IF EXISTS "Supervisors can update pending vouchers" ON public.mileage_vouchers;

CREATE POLICY "Supervisors can update pending vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (
  status = 'pending_supervisor'::voucher_status 
  AND has_role(auth.uid(), 'supervisor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role)
  AND status IN ('pending_vp'::voucher_status, 'rejected'::voucher_status)
);