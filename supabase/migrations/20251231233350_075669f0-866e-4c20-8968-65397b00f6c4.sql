-- Create expenses table for tracking daily expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  description text,
  debtor text,
  transaction_type text NOT NULL CHECK (transaction_type IN ('taxes', 'expenses', 'revenue')),
  category text NOT NULL CHECK (category IN ('business', 'personal')),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Admins can manage all expenses
CREATE POLICY "Admins can manage expenses"
ON public.expenses
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();