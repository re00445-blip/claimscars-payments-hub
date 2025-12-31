-- Add payment_method and classification columns to expenses table
ALTER TABLE public.expenses 
ADD COLUMN payment_method text,
ADD COLUMN classification text;