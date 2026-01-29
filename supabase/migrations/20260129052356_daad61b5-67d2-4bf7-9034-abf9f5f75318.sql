
-- Grant necessary permissions to authenticated role for mileage_vouchers
GRANT SELECT, INSERT, UPDATE ON public.mileage_vouchers TO authenticated;

-- Also ensure approval_history has proper grants (needed for approval workflow)
GRANT SELECT, INSERT ON public.approval_history TO authenticated;
