-- Fix mileage_vouchers UPDATE policies: change from RESTRICTIVE to PERMISSIVE

-- Drop existing restrictive UPDATE policies
DROP POLICY IF EXISTS "Users can update their draft vouchers" ON public.mileage_vouchers;
DROP POLICY IF EXISTS "Supervisors can update pending vouchers" ON public.mileage_vouchers;
DROP POLICY IF EXISTS "VPs can update pending vouchers" ON public.mileage_vouchers;
DROP POLICY IF EXISTS "COOs can update pending vouchers" ON public.mileage_vouchers;

-- Recreate as PERMISSIVE policies (default behavior, OR logic)
CREATE POLICY "Users can update their draft vouchers" 
ON public.mileage_vouchers 
FOR UPDATE 
USING ((auth.uid() = user_id) AND (status = ANY (ARRAY['draft'::voucher_status, 'rejected'::voucher_status])))
WITH CHECK ((auth.uid() = user_id) AND (status = ANY (ARRAY['draft'::voucher_status, 'rejected'::voucher_status, 'pending_supervisor'::voucher_status])));

CREATE POLICY "Supervisors can update pending vouchers" 
ON public.mileage_vouchers 
FOR UPDATE 
USING ((status = 'pending_supervisor'::voucher_status) AND has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK ((status = ANY (ARRAY['pending_vp'::voucher_status, 'rejected'::voucher_status, 'pending_supervisor'::voucher_status])) AND has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "VPs can update pending vouchers" 
ON public.mileage_vouchers 
FOR UPDATE 
USING ((status = 'pending_vp'::voucher_status) AND has_role(auth.uid(), 'vp'::app_role))
WITH CHECK ((status = ANY (ARRAY['pending_coo'::voucher_status, 'rejected'::voucher_status, 'pending_vp'::voucher_status])) AND has_role(auth.uid(), 'vp'::app_role));

CREATE POLICY "COOs can update pending vouchers" 
ON public.mileage_vouchers 
FOR UPDATE 
USING ((status = 'pending_coo'::voucher_status) AND has_role(auth.uid(), 'coo'::app_role))
WITH CHECK ((status = ANY (ARRAY['approved'::voucher_status, 'rejected'::voucher_status, 'pending_coo'::voucher_status])) AND has_role(auth.uid(), 'coo'::app_role));