-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Create policy for admins to manage receipts
CREATE POLICY "Admins can manage receipts"
ON storage.objects
FOR ALL
USING (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'receipts' AND has_role(auth.uid(), 'admin'::app_role));

-- Create digital_receipts table
CREATE TABLE public.digital_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  vendor text,
  amount numeric,
  receipt_date date DEFAULT CURRENT_DATE,
  description text,
  category text CHECK (category IN ('business', 'personal')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digital_receipts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all receipts
CREATE POLICY "Admins can manage digital receipts"
ON public.digital_receipts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_digital_receipts_updated_at
BEFORE UPDATE ON public.digital_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();