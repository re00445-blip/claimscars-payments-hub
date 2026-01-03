-- Create passwords table for storing account credentials
CREATE TABLE public.passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account text NOT NULL,
  login text NOT NULL,
  password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

-- Only admins can view passwords (will be filtered by permission in app)
CREATE POLICY "Admins can view passwords"
ON public.passwords
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only specific admin can manage passwords
CREATE POLICY "Specific admin can manage passwords"
ON public.passwords
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email = 'ramon@carsandclaims.com'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_passwords_updated_at
BEFORE UPDATE ON public.passwords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();