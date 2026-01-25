-- Fix security issues: Add missing restrictive policies

-- =============================================
-- USER_ROLES TABLE - Add restrictive INSERT/UPDATE/DELETE policies
-- These should only be manageable by system (service role) not users
-- =============================================

-- Policy to explicitly deny user INSERT on user_roles (roles assigned by system only)
CREATE POLICY "No user can insert roles" 
  ON user_roles FOR INSERT 
  TO authenticated 
  WITH CHECK (false);

-- Policy to explicitly deny user UPDATE on user_roles  
CREATE POLICY "No user can update roles" 
  ON user_roles FOR UPDATE 
  TO authenticated 
  USING (false);

-- Policy to explicitly deny user DELETE on user_roles
CREATE POLICY "No user can delete roles" 
  ON user_roles FOR DELETE 
  TO authenticated 
  USING (false);

-- =============================================
-- PROFILES TABLE - Add DELETE policy (users can only delete their own)
-- =============================================
CREATE POLICY "Users can delete their own profile" 
  ON profiles FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);