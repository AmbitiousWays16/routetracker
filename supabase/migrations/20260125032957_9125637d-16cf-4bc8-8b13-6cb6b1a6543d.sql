-- Phase 1 & 2: Comprehensive RLS Policy Hardening
-- Fix programs table user_id exposure and add TO authenticated to all policies

-- =============================================
-- PROFILES TABLE - Restrict to authenticated only
-- =============================================
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- =============================================
-- PROGRAMS TABLE - Fix public exposure and restrict to authenticated
-- =============================================
DROP POLICY IF EXISTS "Anyone can view programs" ON programs;
CREATE POLICY "Authenticated users can view programs" 
  ON programs FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Admins can create programs" ON programs;
CREATE POLICY "Admins can create programs" 
  ON programs FOR INSERT 
  TO authenticated 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update programs" ON programs;
CREATE POLICY "Admins can update programs" 
  ON programs FOR UPDATE 
  TO authenticated 
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete programs" ON programs;
CREATE POLICY "Admins can delete programs" 
  ON programs FOR DELETE 
  TO authenticated 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TRIPS TABLE - Restrict to authenticated only
-- =============================================
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
CREATE POLICY "Users can view their own trips" 
  ON trips FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
CREATE POLICY "Users can create their own trips" 
  ON trips FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
CREATE POLICY "Users can update their own trips" 
  ON trips FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;
CREATE POLICY "Users can delete their own trips" 
  ON trips FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- =============================================
-- USER_ROLES TABLE - Restrict to authenticated only
-- =============================================
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" 
  ON user_roles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);