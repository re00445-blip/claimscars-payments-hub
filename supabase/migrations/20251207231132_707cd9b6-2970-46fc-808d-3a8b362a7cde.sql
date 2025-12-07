-- Create purchase applications table for intake forms
CREATE TABLE public.purchase_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id),
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  desired_term_months INTEGER NOT NULL DEFAULT 36,
  estimated_monthly_payment NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own applications"
ON public.purchase_applications
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create applications"
ON public.purchase_applications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all applications"
ON public.purchase_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_purchase_applications_updated_at
BEFORE UPDATE ON public.purchase_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();