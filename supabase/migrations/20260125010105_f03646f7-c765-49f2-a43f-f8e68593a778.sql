-- Create app_role enum for role management
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop existing programs policies
DROP POLICY IF EXISTS "Users can view their own programs" ON public.programs;
DROP POLICY IF EXISTS "Users can create their own programs" ON public.programs;
DROP POLICY IF EXISTS "Users can update their own programs" ON public.programs;
DROP POLICY IF EXISTS "Users can delete their own programs" ON public.programs;

-- Create new policies: everyone can read, only admins can modify
CREATE POLICY "Anyone can view programs"
ON public.programs
FOR SELECT
USING (true);

CREATE POLICY "Admins can create programs"
ON public.programs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update programs"
ON public.programs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete programs"
ON public.programs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));