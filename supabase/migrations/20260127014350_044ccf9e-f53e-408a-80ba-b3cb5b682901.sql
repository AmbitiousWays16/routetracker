-- Allow admin to insert user roles
DROP POLICY IF EXISTS "No user can insert roles" ON public.user_roles;
CREATE POLICY "Admin can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to update user roles
DROP POLICY IF EXISTS "No user can update roles" ON public.user_roles;
CREATE POLICY "Admin can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete user roles
DROP POLICY IF EXISTS "No user can delete roles" ON public.user_roles;
CREATE POLICY "Admin can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to view all user roles (for management UI)
CREATE POLICY "Admin can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));