-- Drop the existing view and recreate with security_invoker = true
-- This ensures the view inherits RLS policies from the profiles table
DROP VIEW IF EXISTS public.profiles_approver_view;

CREATE VIEW public.profiles_approver_view
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  full_name,
  job_title,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to authenticated users (RLS on profiles table will restrict actual access)
GRANT SELECT ON public.profiles_approver_view TO authenticated;

COMMENT ON VIEW public.profiles_approver_view IS 'Security-invoker view that inherits RLS from profiles table. Excludes sensitive fields like email and signature for approver context.';