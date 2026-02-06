-- Allow all authenticated users to view approver roles for dropdown selection
-- This is needed so employees can select supervisors when submitting vouchers,
-- and supervisors can select VPs, etc.
CREATE POLICY "Authenticated users can view approver roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (role IN ('supervisor', 'vp', 'coo', 'accountant'));