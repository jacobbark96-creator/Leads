const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pznqrbfgrvfmkdprifst.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0');
async function debug() {
  const { data: purchases, error } = await supabase
    .from('lead_purchases')
    .select('id, status, metadata, lead:leads(company, name, postcode, city)')
    .eq('status', 'sat');
  console.log('Error:', error);
  console.log('Purchases in sat status:', purchases ? purchases.length : 0);
  if (purchases && purchases.length > 0) {
    console.log('Sample:', JSON.stringify(purchases[0], null, 2));
  }
}
debug();
