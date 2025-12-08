-- Create payment settings table for admin-configurable payment methods
CREATE TABLE public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  is_enabled boolean DEFAULT true,
  instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all settings
CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view enabled payment settings (needed for payment portal)
CREATE POLICY "Anyone can view enabled payment settings"
ON public.payment_settings
FOR SELECT
USING (is_enabled = true);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment methods
INSERT INTO public.payment_settings (setting_key, setting_value, is_enabled, instructions) VALUES
('stripe_enabled', 'true', true, 'Pay securely with your credit or debit card'),
('apple_pay_enabled', 'true', true, 'Pay quickly with Apple Pay'),
('cashapp_cashtag', '$CarsAndClaims', true, 'Send payment to our Cash App'),
('zelle_contact', '470-519-6717', true, 'Send payment via Zelle to this phone number'),
('business_name', 'Cars & Claims LLC', true, NULL);