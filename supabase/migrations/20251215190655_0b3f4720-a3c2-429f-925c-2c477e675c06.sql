-- Drop old affiliate policies that use email matching
DROP POLICY IF EXISTS "Affiliates can insert their referred claims" ON public.injury_claims;
DROP POLICY IF EXISTS "Affiliates can update their referred claims" ON public.injury_claims;
DROP POLICY IF EXISTS "Affiliates can view their referred claims" ON public.injury_claims;

-- Create new policies using user_id for reliable matching
CREATE POLICY "Affiliates can view their referred claims"
ON public.injury_claims
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = injury_claims.affiliate_id
    AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "Affiliates can insert their referred claims"
ON public.injury_claims
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = affiliate_id
    AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "Affiliates can update their referred claims"
ON public.injury_claims
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = injury_claims.affiliate_id
    AND ma.user_id = auth.uid()
  )
);