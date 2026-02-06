-- Drop the restrictive supervisor update policy and recreate as permissive
DROP POLICY IF EXISTS "Supervisors can update pending vouchers" ON public.mileage_vouchers;

CREATE POLICY "Supervisors can update pending vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (
  (status = 'pending_supervisor'::voucher_status) 
  AND has_role(auth.uid(), 'supervisor'::app_role)
)
WITH CHECK (
  (status = ANY (ARRAY['pending_vp'::voucher_status, 'rejected'::voucher_status])) 
  AND has_role(auth.uid(), 'supervisor'::app_role)
);

-- Drop and recreate VP update policy as permissive
DROP POLICY IF EXISTS "VPs can update pending vouchers" ON public.mileage_vouchers;

CREATE POLICY "VPs can update pending vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (
  (status = 'pending_vp'::voucher_status) 
  AND has_role(auth.uid(), 'vp'::app_role)
)
WITH CHECK (
  (status = ANY (ARRAY['pending_coo'::voucher_status, 'rejected'::voucher_status])) 
  AND has_role(auth.uid(), 'vp'::app_role)
);

-- Drop and recreate COO update policy as permissive
DROP POLICY IF EXISTS "COOs can update pending vouchers" ON public.mileage_vouchers;

CREATE POLICY "COOs can update pending vouchers"
ON public.mileage_vouchers
FOR UPDATE
TO authenticated
USING (
  (status = 'pending_coo'::voucher_status) 
  AND has_role(auth.uid(), 'coo'::app_role)
)
WITH CHECK (
  (status = ANY (ARRAY['approved'::voucher_status, 'rejected'::voucher_status])) 
  AND has_role(auth.uid(), 'coo'::app_role)
);