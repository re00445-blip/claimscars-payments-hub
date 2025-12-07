-- Allow users to read their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to manage all roles (using the existing has_role function)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));