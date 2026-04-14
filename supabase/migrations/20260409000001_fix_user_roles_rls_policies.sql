-- Fix: user_roles has RLS enabled (since migration 20251007150455) but ZERO policies.
-- This causes admin toggle switches to silently fail and role queries to return empty.
-- The has_role() function works because it's SECURITY DEFINER, but direct queries don't.

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage (insert/update/delete) all roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
