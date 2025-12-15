-- Drop the restrictive admin policy and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage affiliates" ON public.marketing_affiliates;

CREATE POLICY "Admins can manage affiliates"
ON public.marketing_affiliates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));