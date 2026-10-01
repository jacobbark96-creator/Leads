DROP POLICY IF EXISTS "Public Access email-assets" ON storage.objects;
CREATE POLICY "Public Access email-assets" ON storage.objects FOR SELECT USING (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "Auth Insert email-assets" ON storage.objects;
CREATE POLICY "Auth Insert email-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "Auth Update email-assets" ON storage.objects;
CREATE POLICY "Auth Update email-assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "Auth Delete email-assets" ON storage.objects;
CREATE POLICY "Auth Delete email-assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'email-assets');
