-- Fix app_role enum to include supervisor, vp, and coo roles
-- This addresses the type mismatch causing rejection failures

-- PostgreSQL doesn't allow direct enum value additions, so we need to:
-- 1. Create a new type with all values
-- 2. Cast existing columns
-- 3. Drop old type
-- 4. Rename new type

-- Create new enum with all required roles
CREATE TYPE public.app_role_new AS ENUM ('admin', 'user', 'supervisor', 'vp', 'coo');

-- Convert user_roles.role to new enum type
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_new USING role::text::public.app_role_new;

-- Convert approval_history.approver_role to new enum type
ALTER TABLE public.approval_history 
  ALTER COLUMN approver_role TYPE public.app_role_new USING approver_role::text::public.app_role_new;

-- Drop old enum type
DROP TYPE public.app_role;

-- Rename new type to original name
ALTER TYPE public.app_role_new RENAME TO app_role;
