
-- Recreate the approver view to include email but exclude signature fields
DROP VIEW IF EXISTS public.profiles_approver_view;

CREATE VIEW public.profiles_approver_view
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.email,
  p.job_title,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id
  AND ur.role IN ('supervisor', 'vp', 'coo', 'accountant')
);

GRANT SELECT ON public.profiles_approver_view TO authenticated;
