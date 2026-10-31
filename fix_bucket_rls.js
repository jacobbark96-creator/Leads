import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data, error } = await supabase.rpc('run_sql', {
    sql_query: `
      CREATE POLICY "Allow public uploads to installer_logos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'installer_logos');
      CREATE POLICY "Allow public select on installer_logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'installer_logos');
      CREATE POLICY "Allow public update to installer_logos" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'installer_logos');
      CREATE POLICY "Allow public delete from installer_logos" ON storage.objects FOR DELETE TO public USING (bucket_id = 'installer_logos');
    `
  });
  console.log('Result:', data, 'Error:', error);
}
fix();
