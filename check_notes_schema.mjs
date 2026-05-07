import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('lead_notes').select('*').limit(1);
  console.log('lead_notes:', error || 'success');
  const { data: data2, error: error2 } = await supabase.from('contractor_notes').select('*').limit(1);
  console.log('contractor_notes:', error2 || 'success');
}
check();
