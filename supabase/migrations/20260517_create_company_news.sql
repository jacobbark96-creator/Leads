CREATE TABLE IF NOT EXISTS company_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'Company News',
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE company_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON company_news FOR SELECT USING (true);
CREATE POLICY "Enable insert for super_admins" ON company_news FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);
