const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPaths = ['.env.local', '.env'];
for (const ePath of envPaths) {
  const fullPath = path.join(__dirname, ePath);
  if (fs.existsSync(fullPath)) {
    const envConfig = fs.readFileSync(fullPath, 'utf8').split('\n');
    for (const line of envConfig) {
      if (line.trim() && !line.startsWith('#')) {
        const idx = line.indexOf('=');
        if (idx !== -1) {
          const key = line.slice(0, idx).trim();
          let val = line.slice(idx + 1).trim();
          val = val.replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: notes, error: notesError } = await supabase
    .from('lead_notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log("Last 10 notes:");
  console.log(JSON.stringify(notes, null, 2));
  if (notesError) console.error("Notes error:", notesError);
}
check();