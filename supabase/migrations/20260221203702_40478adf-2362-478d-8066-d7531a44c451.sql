
-- Add entry_type to track manual vs automatic payments
ALTER TABLE public.payments ADD COLUMN entry_type text NOT NULL DEFAULT 'manual';

-- Add waiver tracking per payment
ALTER TABLE public.payments ADD COLUMN waived_interest numeric DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN waived_late_fees numeric DEFAULT 0;
