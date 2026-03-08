-- Revoke EXECUTE on archive_old_routes from public and authenticated roles
-- The function already has an internal admin guard, but defense-in-depth
-- means we should also prevent non-admin users from even calling it.
REVOKE EXECUTE ON FUNCTION public.archive_old_routes(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_old_routes(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_old_routes(integer) FROM anon;

-- Grant execute only to service_role (for scheduled jobs / admin edge functions)
-- Note: The function's internal has_role() check is still the primary guard.
-- Admins who need to call it should do so through a privileged edge function.
