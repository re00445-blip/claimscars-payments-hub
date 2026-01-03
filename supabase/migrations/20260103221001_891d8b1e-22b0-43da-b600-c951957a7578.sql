-- Create table for vehicle cost breakdowns
CREATE TABLE public.vehicle_cost_breakdowns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for vehicle cost documents/invoices
CREATE TABLE public.vehicle_cost_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_cost_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_cost_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for cost breakdowns - admin only
CREATE POLICY "Admins can manage cost breakdowns"
ON public.vehicle_cost_breakdowns
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for cost documents - admin only
CREATE POLICY "Admins can manage cost documents"
ON public.vehicle_cost_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_vehicle_cost_breakdowns_updated_at
BEFORE UPDATE ON public.vehicle_cost_breakdowns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();