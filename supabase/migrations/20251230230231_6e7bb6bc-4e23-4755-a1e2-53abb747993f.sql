-- Rename commission_rate to flat_fee and update default
ALTER TABLE public.marketing_affiliates 
RENAME COLUMN commission_rate TO flat_fee;

-- Update the default value to a reasonable flat fee default
ALTER TABLE public.marketing_affiliates 
ALTER COLUMN flat_fee SET DEFAULT 100;