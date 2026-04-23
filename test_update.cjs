const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function testUpdate() {
  const { data: lead } = await supabase.from('leads').select('id').limit(1).single();
  if (!lead) return console.log("No lead");
  
  const updateData = {
    status: 'qualified',
    property_ownership: 'Owned',
    payment_options: 'CAPEX',
    roof_size: '50 SqM',
    electrical_supply: 'Single Phase',
    solar_location: 'Roof',
    availability: 'ASAP',
    job_title: 'Manager',
    bills_url: 'http://example.com/bill.pdf'
  };

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', lead.id)
    .select();

  console.log("Update Error:", error);
}
testUpdate();