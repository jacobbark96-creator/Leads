const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: leads } = await supabase.from('leads').select('id').order('created_at', { ascending: false }).limit(1);
  if (!leads || leads.length === 0) return console.log("no leads");
  
  const id = leads[0].id;
  console.log("Testing lead ID:", id);
  
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      companies!companies_lead_id_fkey (
        id, normalized_name, company_number, incorporation_date, sic_code, industry, employee_count, estimated_revenue, description,
        contacts (
          id, full_name, role, email, mobile, linkedin_url, confidence_score, source
        )
      ),
      buildings!buildings_lead_id_fkey (
        id, property_type, roof_type, roof_area_estimate, solar_potential_score, epc_rating, orientation, estimated_energy_usage, installation_complexity, max_array_panels_count, max_sunshine_hours_per_year, satellite_image_url, latitude, longitude
      )
    `)
    .eq('id', id)
    .single();
    
  console.log("Error:", error);
  console.log("Data:", data ? "Success" : "None");
}
main();
