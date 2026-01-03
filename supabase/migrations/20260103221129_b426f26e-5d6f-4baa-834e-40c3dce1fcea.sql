-- Create storage bucket for vehicle cost documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-cost-docs', 'vehicle-cost-docs', true);

-- Create storage policies for vehicle cost documents
CREATE POLICY "Admins can upload vehicle cost docs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'vehicle-cost-docs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view vehicle cost docs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'vehicle-cost-docs' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete vehicle cost docs"
ON storage.objects
FOR DELETE
USING (bucket_id = 'vehicle-cost-docs' AND has_role(auth.uid(), 'admin'::app_role));