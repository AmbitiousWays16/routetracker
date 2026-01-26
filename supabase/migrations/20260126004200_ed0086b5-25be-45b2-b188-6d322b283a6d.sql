-- First migration: Add new roles to the app_role enum
-- These need to be committed before they can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vp';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coo';