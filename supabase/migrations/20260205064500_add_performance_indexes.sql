-- Add performance indexes for critical queries
-- These indexes optimize the most frequently used query patterns

-- CRITICAL: Trips table - user_id + date range queries (useTrips hook)
-- Speeds up monthly trip fetching by 10-100x for users with many trips
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_user_date 
  ON public.trips(user_id, date);

-- CRITICAL: Vouchers status filtering (useApproverVouchers hook)
-- Partial index excludes completed vouchers to save space
-- Speeds up approval page loading by filtering before sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vouchers_status 
  ON public.mileage_vouchers(status) 
  WHERE status IN ('pending_supervisor', 'pending_vp', 'pending_coo');

-- CRITICAL: Vouchers status + submitted_at (useApproverVouchers hook with ORDER BY)
-- Composite index for filtered + sorted queries on approval page
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vouchers_status_submitted 
  ON public.mileage_vouchers(status, submitted_at);

-- CRITICAL: User roles - RLS policy checks via has_role() function
-- Speeds up role-based access control checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_role 
  ON public.user_roles(role);

-- MEDIUM: Vouchers user_id + month lookup (useVouchers hook)
-- Optimizes user's voucher history view
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vouchers_user_month 
  ON public.mileage_vouchers(user_id, month);

-- MEDIUM: Approval history voucher_id lookup
-- Speeds up approval history fetching and CASCADE deletes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_history_voucher 
  ON public.approval_history(voucher_id);

-- MEDIUM: Profiles user_id for JOIN operations
-- Optimizes joins with profiles table in approval queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id 
  ON public.profiles(user_id);

-- Note: CONCURRENTLY allows index creation without locking the table
-- Safe for production use with existing data
