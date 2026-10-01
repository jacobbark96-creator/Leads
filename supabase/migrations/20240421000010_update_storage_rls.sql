-- Migration: Update storage policies for lead photos
-- Description: Allows authenticated users to upload and manage photos in the lead-photos bucket.

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;

-- Recreate read access (public)
CREATE POLICY "Public Read Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'lead-photos');

-- Create insert access (all authenticated users)
CREATE POLICY "Authenticated Insert Access" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'lead-photos' AND auth.role() = 'authenticated');

-- Create update access (all authenticated users)
CREATE POLICY "Authenticated Update Access" ON storage.objects 
FOR UPDATE USING (bucket_id = 'lead-photos' AND auth.role() = 'authenticated');

-- Create delete access (all authenticated users)
CREATE POLICY "Authenticated Delete Access" ON storage.objects 
FOR DELETE USING (bucket_id = 'lead-photos' AND auth.role() = 'authenticated');