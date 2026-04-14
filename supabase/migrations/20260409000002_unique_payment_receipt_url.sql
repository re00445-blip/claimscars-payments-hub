-- Fix: prevent duplicate payments from race condition.
-- Two simultaneous verify-stripe-payment calls can both pass the existing-payment
-- check and insert duplicate records. A UNIQUE constraint prevents this at the DB level.
-- receipt_url stores the Stripe session ID for online payments.

-- Only apply to non-null values (manual payments have null receipt_url)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_receipt_url_unique
ON public.payments (receipt_url)
WHERE receipt_url IS NOT NULL;
