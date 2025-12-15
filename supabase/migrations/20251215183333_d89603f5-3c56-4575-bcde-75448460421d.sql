-- Allow affiliates to read their own marketing_affiliates record
CREATE POLICY "Affiliates can view their own record"
ON public.marketing_affiliates
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);