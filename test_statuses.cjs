const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: statusData } = await supabase.from('leads').select('status');
  const { data: salesPipelineData } = await supabase.from('leads').select('sales_pipeline_status');
  
  const statuses = [...new Set(statusData.map(d => d.status))];
  const salesStatuses = [...new Set(salesPipelineData.map(d => d.sales_pipeline_status))];
  
  console.log('Statuses:', statuses);
  console.log('Sales Pipeline Statuses:', salesStatuses);
}
run();
