-- Update the default flat_fee to 250
ALTER TABLE public.marketing_affiliates 
ALTER COLUMN flat_fee SET DEFAULT 250;