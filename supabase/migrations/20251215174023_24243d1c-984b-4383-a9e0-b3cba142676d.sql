-- Add affiliate_id to injury_claims for tracking referrals
ALTER TABLE public.injury_claims 
ADD COLUMN affiliate_id UUID REFERENCES public.marketing_affiliates(id) ON DELETE SET NULL;

-- Create affiliate_notes table for case tracking
CREATE TABLE public.affiliate_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.injury_claims(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES public.marketing_affiliates(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_notes - affiliates can only manage their own notes
CREATE POLICY "Affiliates can manage their own notes"
ON public.affiliate_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = affiliate_notes.affiliate_id
    AND ma.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Admins can manage all notes
CREATE POLICY "Admins can manage all notes"
ON public.affiliate_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update injury_claims RLS to allow affiliates to view/manage their referred claims
CREATE POLICY "Affiliates can view their referred claims"
ON public.injury_claims
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = injury_claims.affiliate_id
    AND ma.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Affiliates can insert their referred claims"
ON public.injury_claims
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = affiliate_id
    AND ma.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Affiliates can update their referred claims"
ON public.injury_claims
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_affiliates ma
    WHERE ma.id = injury_claims.affiliate_id
    AND ma.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Trigger for updated_at on affiliate_notes
CREATE TRIGGER update_affiliate_notes_updated_at
BEFORE UPDATE ON public.affiliate_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();