-- Add columns to track waived late fees and interest for customer accounts
ALTER TABLE public.customer_accounts
ADD COLUMN waived_late_fees numeric DEFAULT 0,
ADD COLUMN waived_interest numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.customer_accounts.waived_late_fees IS 'Total late fees waived for this account';
COMMENT ON COLUMN public.customer_accounts.waived_interest IS 'Total interest waived for this account';