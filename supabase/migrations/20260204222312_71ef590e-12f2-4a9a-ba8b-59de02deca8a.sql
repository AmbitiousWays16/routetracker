-- Add SELECT policy for accountants to view approval history for approved vouchers
CREATE POLICY "Accountants can view approval history for approved vouchers"
ON public.approval_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'accountant'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM mileage_vouchers v 
    WHERE v.id = approval_history.voucher_id 
    AND v.status = 'approved'::voucher_status
  )
);