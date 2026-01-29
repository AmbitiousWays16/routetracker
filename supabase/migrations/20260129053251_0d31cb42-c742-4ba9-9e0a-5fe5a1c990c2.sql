-- Fix RLS UPDATE policies so status transitions are allowed.
-- Current policies had USING but no WITH CHECK, so changing status caused
-- "new row violates row-level security policy".

-- Employee: allow updating draft/rejected vouchers, including submitting to supervisor.
ALTER POLICY "Users can update their draft vouchers"
ON public.mileage_vouchers
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY['draft'::voucher_status, 'rejected'::voucher_status])
)
WITH CHECK (
  auth.uid() = user_id
  AND status = ANY (ARRAY['draft'::voucher_status, 'rejected'::voucher_status, 'pending_supervisor'::voucher_status])
);

-- Supervisor: can approve to pending_vp or reject.
ALTER POLICY "Supervisors can update pending vouchers"
ON public.mileage_vouchers
USING (
  status = 'pending_supervisor'::voucher_status
  AND has_role(auth.uid(), 'supervisor'::app_role)
)
WITH CHECK (
  status = ANY (ARRAY['pending_vp'::voucher_status, 'rejected'::voucher_status, 'pending_supervisor'::voucher_status])
  AND has_role(auth.uid(), 'supervisor'::app_role)
);

-- VP: can approve to pending_coo or reject.
ALTER POLICY "VPs can update pending vouchers"
ON public.mileage_vouchers
USING (
  status = 'pending_vp'::voucher_status
  AND has_role(auth.uid(), 'vp'::app_role)
)
WITH CHECK (
  status = ANY (ARRAY['pending_coo'::voucher_status, 'rejected'::voucher_status, 'pending_vp'::voucher_status])
  AND has_role(auth.uid(), 'vp'::app_role)
);

-- COO: can approve to approved or reject.
ALTER POLICY "COOs can update pending vouchers"
ON public.mileage_vouchers
USING (
  status = 'pending_coo'::voucher_status
  AND has_role(auth.uid(), 'coo'::app_role)
)
WITH CHECK (
  status = ANY (ARRAY['approved'::voucher_status, 'rejected'::voucher_status, 'pending_coo'::voucher_status])
  AND has_role(auth.uid(), 'coo'::app_role)
);