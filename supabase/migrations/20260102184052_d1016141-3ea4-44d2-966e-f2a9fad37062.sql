-- Add explicit interest type to customer accounts so flat fees display correctly
ALTER TABLE public.customer_accounts
ADD COLUMN IF NOT EXISTS interest_rate_type text NOT NULL DEFAULT 'percentage';

-- Backfill likely flat-fee accounts (typical APR is far below this)
UPDATE public.customer_accounts
SET interest_rate_type = 'flat_fee'
WHERE interest_rate_type = 'percentage'
  AND interest_rate >= 50;