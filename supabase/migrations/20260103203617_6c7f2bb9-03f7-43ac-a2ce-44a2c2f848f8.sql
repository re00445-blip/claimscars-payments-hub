-- Drop existing policies
DROP POLICY IF EXISTS "Admins with permission can view passwords" ON public.passwords;
DROP POLICY IF EXISTS "Admins with permission can insert passwords" ON public.passwords;
DROP POLICY IF EXISTS "Admins with permission can update passwords" ON public.passwords;
DROP POLICY IF EXISTS "Only Ramon can delete passwords" ON public.passwords;

-- Allow admins with passwords permission to view
CREATE POLICY "Admins with permission can view passwords"
ON public.passwords
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (
    has_permission(auth.uid(), 'passwords') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'ramon@carsandclaims.com')
  )
);

-- Allow admins with passwords permission to insert
CREATE POLICY "Admins with permission can insert passwords"
ON public.passwords
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (
    has_permission(auth.uid(), 'passwords') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'ramon@carsandclaims.com')
  )
);

-- Allow admins with passwords permission to update
CREATE POLICY "Admins with permission can update passwords"
ON public.passwords
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (
    has_permission(auth.uid(), 'passwords') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'ramon@carsandclaims.com')
  )
);

-- Only Ramon can delete passwords
CREATE POLICY "Only Ramon can delete passwords"
ON public.passwords
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND email = 'ramon@carsandclaims.com')
);