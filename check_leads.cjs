const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: pack } = await supabase.from('lead_packs').select('*').eq('name', 'IIndustrial Ex').single();
  
  if (pack) {
    const { data: memberships } = await supabase.from('lead_pack_memberships').select('*').eq('lead_pack_id', pack.id).limit(5);
    
    if (memberships && memberships.length > 0) {
      const leadIds = memberships.map(m => m.lead_id);
      const { data: leads, error } = await supabase.from('leads').select('id, is_private, assigned_to, division_id, lead_type').in('id', leadIds);
      if (error) console.error('Leads error:', error);
      console.log('Leads in pack:', leads);
    }
  }
}
check().catch(console.error);