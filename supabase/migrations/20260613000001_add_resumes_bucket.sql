-- Create resumes bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Resumes are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload resumes." ON storage.objects;

-- Create policies for resumes bucket
CREATE POLICY "Resumes are publicly accessible." 
ON storage.objects FOR SELECT 
USING (bucket_id = 'resumes');

-- Allow public uploads for job applications
CREATE POLICY "Anyone can upload resumes." 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'resumes');
