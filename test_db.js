import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data, error } = await supabase.from('leads').select('id, name, last_dialed_at').limit(5);
  console.log('Leads:', data);
  const { data: notes, error: notesError } = await supabase.from('lead_notes').select('id, lead_id, created_at').limit(5);
  console.log('Notes:', notes);
}

check();
