-- Add referral_source and agreement_amount columns to injury_claims
ALTER TABLE public.injury_claims
ADD COLUMN referral_source text,
ADD COLUMN agreement_amount numeric;