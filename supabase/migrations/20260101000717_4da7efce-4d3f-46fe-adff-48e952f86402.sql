-- Create a table for admin-configurable dropdown options
CREATE TABLE public.dropdown_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- 'vendor', 'classification', 'payment_method'
  value text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(category, value)
);

-- Enable RLS
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

-- Anyone can view active options
CREATE POLICY "Anyone can view active dropdown options"
ON public.dropdown_options
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage options
CREATE POLICY "Admins can manage dropdown options"
ON public.dropdown_options
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_dropdown_options_updated_at
BEFORE UPDATE ON public.dropdown_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default values
INSERT INTO public.dropdown_options (category, value, sort_order) VALUES
-- Vendors
('vendor', 'Apple', 1),
('vendor', 'Delta', 2),
('vendor', 'Amazon', 3),
('vendor', 'BOA', 4),
('vendor', 'WF', 5),
('vendor', 'Chase', 6),
('vendor', 'NF', 7),
('vendor', 'Other', 100),
-- Classifications
('classification', 'Operating Expense', 1),
('classification', 'Cost of Goods Sold', 2),
('classification', 'Payroll', 3),
('classification', 'Marketing', 4),
('classification', 'Utilities', 5),
('classification', 'Insurance', 6),
('classification', 'Office Supplies', 7),
('classification', 'Vehicle Expense', 8),
('classification', 'Professional Services', 9),
('classification', 'Rent', 10),
('classification', 'Interest', 11),
('classification', 'Depreciation', 12),
('classification', 'Food', 13),
('classification', 'Gas', 14),
('classification', 'Other', 100),
-- Payment Methods
('payment_method', 'Cash', 1),
('payment_method', 'Check', 2),
('payment_method', 'Credit Card', 3),
('payment_method', 'Debit Card', 4),
('payment_method', 'Wire Transfer', 5),
('payment_method', 'Zelle', 6),
('payment_method', 'Venmo', 7),
('payment_method', 'PayPal', 8),
('payment_method', 'Other', 100);