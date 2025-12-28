-- Create storage bucket for email assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to email assets
CREATE POLICY "Email assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');

-- Allow admins to upload email assets
CREATE POLICY "Admins can upload email assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-assets');