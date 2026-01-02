-- Create a table for customer account documents
CREATE TABLE public.account_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  uploaded_by_role TEXT NOT NULL CHECK (uploaded_by_role IN ('admin', 'customer')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_documents ENABLE ROW LEVEL SECURITY;

-- Admin can view all documents
CREATE POLICY "Admins can view all documents"
ON public.account_documents
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert documents
CREATE POLICY "Admins can insert documents"
ON public.account_documents
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can delete documents
CREATE POLICY "Admins can delete documents"
ON public.account_documents
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Customers can view documents for their accounts
CREATE POLICY "Customers can view their account documents"
ON public.account_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customer_accounts ca
    WHERE ca.id = account_id AND ca.user_id = auth.uid()
  )
);

-- Customers can upload documents to their accounts
CREATE POLICY "Customers can upload to their accounts"
ON public.account_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_accounts ca
    WHERE ca.id = account_id AND ca.user_id = auth.uid()
  )
);