import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: divisions } = await supabase.from('divisions').select('*').ilike('name', '%residential%');
  const resiDiv = divisions[0];
  console.log('Resi Div:', resiDiv.name);

  const { data, error } = await supabase.from('leads').select('status').eq('division_id', resiDiv.id);
  if (data) {
    const counts = {};
    data.forEach(l => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    console.log('Residential Statuses:', counts);
  }
}
check();
