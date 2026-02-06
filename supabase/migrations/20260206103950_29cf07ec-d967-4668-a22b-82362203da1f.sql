-- Allow authenticated users to view profiles of users with approver roles
-- This is needed for the approver selection dropdowns
CREATE POLICY "Users can view approver profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id
    AND ur.role IN ('supervisor', 'vp', 'coo', 'accountant')
  )
);