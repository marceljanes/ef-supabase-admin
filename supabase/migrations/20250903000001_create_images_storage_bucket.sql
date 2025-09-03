-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images', 
  'images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- Set up storage policy for authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Set up storage policy for anyone to view images (since bucket is public)
CREATE POLICY "Anyone can view images" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Set up storage policy for authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete images" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images');
