-- Drop and recreate the view with security_invoker = true
-- This ensures the view respects the RLS policies on the underlying profiles table
-- by using the invoker's (calling user's) permissions instead of the definer's

DROP VIEW IF EXISTS public.profiles_approver_view;

CREATE VIEW public.profiles_approver_view
WITH (security_invoker = true)
AS
SELECT 
    id,
    user_id,
    full_name,
    job_title,
    created_at,
    updated_at
FROM public.profiles;

-- Grant SELECT to authenticated users (RLS on profiles table will filter results)
GRANT SELECT ON public.profiles_approver_view TO authenticated;