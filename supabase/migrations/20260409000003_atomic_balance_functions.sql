-- Atomic balance adjustment: prevents stale-read race conditions.
-- All balance updates should use these functions instead of read-then-write patterns.

-- Adjust account balance by a delta (positive = reduce balance, negative = increase)
-- Returns the new balance. Uses GREATEST(0, ...) to prevent negative balances.
CREATE OR REPLACE FUNCTION public.adjust_account_balance(
  _account_id UUID,
  _principal_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance NUMERIC;
BEGIN
  UPDATE customer_accounts
  SET current_balance = GREATEST(0, current_balance - _principal_delta)
  WHERE id = _account_id
  RETURNING current_balance INTO _new_balance;

  IF _new_balance IS NULL THEN
    RAISE EXCEPTION 'Account % not found', _account_id;
  END IF;

  RETURN _new_balance;
END;
$$;

-- Transactional payment recording: inserts payment + adjusts balance + advances next_payment_date
-- in a single transaction. Used by verify-stripe-payment edge function.
CREATE OR REPLACE FUNCTION public.record_payment_atomic(
  _account_id UUID,
  _amount NUMERIC,
  _principal_paid NUMERIC,
  _interest_paid NUMERIC,
  _late_fee_paid NUMERIC,
  _payment_method TEXT,
  _entry_type TEXT,
  _receipt_url TEXT,
  _notes TEXT,
  _payment_date TIMESTAMPTZ,
  _next_payment_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment RECORD;
  _new_balance NUMERIC;
BEGIN
  -- Insert payment
  INSERT INTO payments (
    account_id, amount, principal_paid, interest_paid, late_fee_paid,
    payment_method, entry_type, receipt_url, notes, payment_date
  ) VALUES (
    _account_id, _amount, _principal_paid, _interest_paid, _late_fee_paid,
    _payment_method, _entry_type, _receipt_url, _notes, _payment_date
  )
  RETURNING * INTO _payment;

  -- Atomically adjust balance and advance payment date
  UPDATE customer_accounts
  SET
    current_balance = GREATEST(0, current_balance - _principal_paid),
    next_payment_date = _next_payment_date
  WHERE id = _account_id
  RETURNING current_balance INTO _new_balance;

  RETURN json_build_object(
    'payment_id', _payment.id,
    'new_balance', _new_balance
  );
END;
$$;
