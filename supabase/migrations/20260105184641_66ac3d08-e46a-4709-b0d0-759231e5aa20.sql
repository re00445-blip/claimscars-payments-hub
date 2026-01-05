-- Add policy to allow anyone to view invoices for shareable preview
CREATE POLICY "Anyone can view invoices for preview"
ON public.invoices
FOR SELECT
USING (true);