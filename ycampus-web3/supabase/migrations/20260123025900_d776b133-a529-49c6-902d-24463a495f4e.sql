-- Create storage bucket for community post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view community images
CREATE POLICY "Anyone can view community images"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload community images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own community images"
ON storage.objects FOR DELETE
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);