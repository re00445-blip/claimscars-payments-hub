-- Add columns for tracking contracts sent and signed
ALTER TABLE public.marketing_affiliates 
ADD COLUMN IF NOT EXISTS contracts_sent integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS contracts_signed integer NOT NULL DEFAULT 0;