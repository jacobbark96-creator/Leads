-- Ensure the storage buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead-photos', 'lead-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead_documents', 'lead_documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public access policies exist for lead-photos
DROP POLICY IF EXISTS "Public Access to lead-photos" ON storage.objects;
CREATE POLICY "Public Access to lead-photos" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'lead-photos' );

DROP POLICY IF EXISTS "Authenticated users can upload lead-photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload lead-photos" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'lead-photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated users can update lead-photos" ON storage.objects;
CREATE POLICY "Authenticated users can update lead-photos" 
ON storage.objects FOR UPDATE 
WITH CHECK ( bucket_id = 'lead-photos' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated users can delete lead-photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete lead-photos" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'lead-photos' AND auth.role() = 'authenticated' );

-- Ensure public access policies exist for lead_documents
DROP POLICY IF EXISTS "Public Access to lead_documents" ON storage.objects;
CREATE POLICY "Public Access to lead_documents" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'lead_documents' );

DROP POLICY IF EXISTS "Authenticated users can upload lead_documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload lead_documents" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'lead_documents' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated users can update lead_documents" ON storage.objects;
CREATE POLICY "Authenticated users can update lead_documents" 
ON storage.objects FOR UPDATE 
WITH CHECK ( bucket_id = 'lead_documents' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated users can delete lead_documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete lead_documents" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'lead_documents' AND auth.role() = 'authenticated' );
