-- Drop old affiliate notes policy that uses email matching
DROP POLICY IF EXISTS "Affiliates can manage their own notes" ON public.affiliate_notes;

-- Create new policy using user_id for reliable matching
CREATE POLICY "Affiliates can manage their own notes"
ON public.affiliate_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = affiliate_notes.affiliate_id
    AND ma.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = affiliate_id
    AND ma.user_id = auth.uid()
  )
);