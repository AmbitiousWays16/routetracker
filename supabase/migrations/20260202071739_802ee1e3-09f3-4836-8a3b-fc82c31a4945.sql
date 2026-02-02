-- Fix: Restrict accountant access to profiles - only allow viewing profiles of users with approved vouchers
-- This prevents unauthorized email harvesting while still allowing accountants to see employee names on vouchers they process

-- Step 1: Drop the overly permissive accountant policy
DROP POLICY IF EXISTS "Accountants can view profiles" ON public.profiles;

-- Step 2: Create a more restrictive policy that only allows accountants to view profiles of users with approved vouchers
CREATE POLICY "Accountants can view profiles for approved vouchers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'accountant'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.mileage_vouchers v
    WHERE v.user_id = profiles.user_id
    AND v.status = 'approved'::voucher_status
  )
);

-- Step 3: Add policy for approvers (Supervisors, VPs, COOs) to view profiles of users whose vouchers they need to approve
-- This allows them to see employee names in the approval workflow
CREATE POLICY "Approvers can view profiles for pending vouchers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Supervisors can view profiles of users with pending_supervisor vouchers
  (has_role(auth.uid(), 'supervisor'::app_role) AND EXISTS (
    SELECT 1 FROM public.mileage_vouchers v
    WHERE v.user_id = profiles.user_id
    AND v.status = 'pending_supervisor'::voucher_status
  ))
  OR
  -- VPs can view profiles of users with pending_vp vouchers
  (has_role(auth.uid(), 'vp'::app_role) AND EXISTS (
    SELECT 1 FROM public.mileage_vouchers v
    WHERE v.user_id = profiles.user_id
    AND v.status = 'pending_vp'::voucher_status
  ))
  OR
  -- COOs can view profiles of users with pending_coo vouchers
  (has_role(auth.uid(), 'coo'::app_role) AND EXISTS (
    SELECT 1 FROM public.mileage_vouchers v
    WHERE v.user_id = profiles.user_id
    AND v.status = 'pending_coo'::voucher_status
  ))
);