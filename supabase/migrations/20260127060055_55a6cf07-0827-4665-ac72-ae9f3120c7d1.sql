-- SECURITY FIX: Revoke all grants from anon role on public tables
-- This prevents unauthenticated access to sensitive data

-- Revoke all privileges from anon role on all tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.trips FROM anon;
REVOKE ALL ON public.mileage_vouchers FROM anon;
REVOKE ALL ON public.approval_history FROM anon;
REVOKE ALL ON public.programs FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

-- Also revoke from PUBLIC to prevent any default grants
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.trips FROM PUBLIC;
REVOKE ALL ON public.mileage_vouchers FROM PUBLIC;
REVOKE ALL ON public.approval_history FROM PUBLIC;
REVOKE ALL ON public.programs FROM PUBLIC;
REVOKE ALL ON public.user_roles FROM PUBLIC;

-- Revoke sequence access from anon to prevent enumeration
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;