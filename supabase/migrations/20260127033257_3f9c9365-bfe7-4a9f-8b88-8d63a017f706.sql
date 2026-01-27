-- Allow accountants to view approved vouchers
CREATE POLICY "Accountants can view approved vouchers"
ON public.mileage_vouchers
FOR SELECT
TO authenticated
USING (
  status = 'approved' AND 
  has_role(auth.uid(), 'accountant'::app_role)
);

-- Allow accountants to view trips for approved vouchers
CREATE POLICY "Accountants can view trips for approved vouchers"
ON public.trips
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'accountant'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.mileage_vouchers v
    WHERE v.user_id = trips.user_id
    AND v.status = 'approved'
    AND date_trunc('month', trips.date::timestamp) = date_trunc('month', v.month::timestamp)
  )
);

-- Allow accountants to view profiles (for employee info on approved vouchers)
CREATE POLICY "Accountants can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'accountant'::app_role));