-- Create a function to increment affiliate referrals
CREATE OR REPLACE FUNCTION public.increment_affiliate_referrals(affiliate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.marketing_affiliates
  SET total_referrals = total_referrals + 1,
      updated_at = now()
  WHERE id = affiliate_id;
END;
$$;