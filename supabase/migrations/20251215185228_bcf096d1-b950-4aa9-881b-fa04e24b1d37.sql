-- Fix affiliate self-access: avoid querying auth.users inside RLS policies
DROP POLICY IF EXISTS "Affiliates can view their own record" ON public.marketing_affiliates;

CREATE POLICY "Affiliates can view their own record"
ON public.marketing_affiliates
FOR SELECT
USING (
  email = (auth.jwt() ->> 'email')
);