-- Link marketing affiliates to auth users via profiles.id for reliable self-access
ALTER TABLE public.marketing_affiliates
ADD COLUMN IF NOT EXISTS user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketing_affiliates_user_id_fkey'
  ) THEN
    ALTER TABLE public.marketing_affiliates
    ADD CONSTRAINT marketing_affiliates_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE SET NULL;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS marketing_affiliates_user_id_unique
ON public.marketing_affiliates(user_id)
WHERE user_id IS NOT NULL;

-- Replace affiliate self-view policy to use auth.uid() instead of email claims
DROP POLICY IF EXISTS "Affiliates can view their own record" ON public.marketing_affiliates;

CREATE POLICY "Affiliates can view their own record"
ON public.marketing_affiliates
FOR SELECT
USING (user_id = auth.uid());