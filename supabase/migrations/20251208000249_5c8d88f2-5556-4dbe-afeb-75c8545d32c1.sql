-- Create table for tracking injury claims
CREATE TABLE public.injury_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  address TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  accident_date DATE NOT NULL,
  injury_area TEXT NOT NULL,
  at_fault TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.injury_claims ENABLE ROW LEVEL SECURITY;

-- Admin can manage all claims
CREATE POLICY "Admins can manage all claims"
ON public.injury_claims
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_injury_claims_updated_at
BEFORE UPDATE ON public.injury_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();