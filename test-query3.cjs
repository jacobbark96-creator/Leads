const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const id = 'fb7c781a-8021-4e1d-8527-dcda460c8304';
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      categories!leads_category_id_fkey (name),
      companies!companies_lead_id_fkey (
        id, normalized_name, company_number, incorporation_date, sic_code, industry, employee_count, estimated_revenue, description,
        contacts (
          id, full_name, role, email, mobile, linkedin_url, confidence_score, source
        )
      ),
      buildings!buildings_lead_id_fkey (
        id, property_type, roof_type, roof_area_estimate, solar_potential_score, epc_rating, orientation, estimated_energy_usage, installation_complexity, max_array_panels_count, max_sunshine_hours_per_year, satellite_image_url, latitude, longitude, marketplace_notes, use_primary_notes, address, building_type, roof_condition, annual_consumption, grid_connection, shading_score, suitability_score
      )
    `)
    .eq('id', id)
    .single();
    
  if (error) console.error('Error:', JSON.stringify(error, null, 2));
  else console.log('Success:', data ? 1 : 0);
}
test();