-- Create storage bucket for claim and repair uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-uploads', 
  'claim-uploads', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- Allow anyone to upload files to this bucket (for anonymous form submissions)
CREATE POLICY "Anyone can upload claim files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'claim-uploads');

-- Allow anyone to view claim files
CREATE POLICY "Anyone can view claim files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'claim-uploads');

-- Allow admins to delete claim files
CREATE POLICY "Admins can delete claim files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'claim-uploads' AND has_role(auth.uid(), 'admin'::app_role));