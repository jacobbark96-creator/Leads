const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function testUpdate() {
  const { data: lead } = await supabase.from('leads').select('*').limit(1).single();
  if (!lead) return console.log("No lead");
  
  const updateData = {
    status: 'qualified',
    category_id: lead.category_id || null,
    monthly_spend: null,
    location: 'Test Location',
    timeframe: 'ASAP',
    roof_condition: 'Good',
    roof_material: 'Tile',
    cover_skylights: false,
    ground_mount: false,
    unit_rate: null,
    est_ann_consumption: null,
    est_system_size: '10kW',
    qualification_notes: 'Test',
    photos: [],
    latitude: null,
    longitude: null,
    property_ownership: 'Owned',
    lease_duration: null,
    likely_to_renew: null,
    landlord_permission: null,
    payment_options: 'CAPEX',
    roof_size: '50',
    electrical_supply: 'Single Phase',
    solar_location: 'Roof',
    availability: 'ASAP',
    job_title: 'Manager',
    bills_url: ''
  };

  console.log("Attempting update...");
  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', lead.id)
    .select()
    .single();

  console.log("Update Data:", data ? "Success" : "No Data");
  console.log("Update Error:", error);
}
testUpdate();