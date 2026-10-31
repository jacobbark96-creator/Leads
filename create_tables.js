const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
if (!urlMatch || !keyMatch) {
  console.log("Missing credentials");
  process.exit(1);
}
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.installers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.regions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        name TEXT NOT NULL,
        installer_id UUID REFERENCES public.installers(id),
        postcode_prefixes TEXT[]
    );

    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS installer_id UUID REFERENCES public.installers(id);
  `;
  
  // Actually we can't run raw SQL easily via JS client. Let's use postgres function or rest API?
  // Is there a rpc to execute sql?
}
run();
