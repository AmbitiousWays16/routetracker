-- Fix RLS policies to allow approvers to reject/return vouchers for corrections
-- The issue is that approvers need explicit WITH CHECK clause to allow status transitions

-- Drop existing approver update policies that only use USING without WITH CHECK
DROP POLICY IF EXISTS "Supervisors can update pending vouchers" ON public.mileage_vouchers;
DROP POLICY IF EXISTS "VPs can update pending vouchers" ON public.mileage_vouchers;
DROP POLICY IF EXISTS "COOs can update pending vouchers" ON public.mileage_vouchers;

-- Create new policies with proper WITH CHECK to allow transitioning to 'rejected' status
-- Supervisors can approve (move to pending_vp) or reject (move to rejected)
CREATE POLICY "Supervisors can update pending supervisor vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (status = 'pending_supervisor' AND has_role(auth.uid(), 'supervisor'))
WITH CHECK (status IN ('pending_vp', 'rejected'));

-- VPs can approve (move to pending_coo) or reject (move to rejected)
CREATE POLICY "VPs can update pending vp vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (status = 'pending_vp' AND has_role(auth.uid(), 'vp'))
WITH CHECK (status IN ('pending_coo', 'rejected'));

-- COOs can approve (move to approved) or reject (move to rejected)
CREATE POLICY "COOs can update pending coo vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (status = 'pending_coo' AND has_role(auth.uid(), 'coo'))
WITH CHECK (status IN ('approved', 'rejected'));
