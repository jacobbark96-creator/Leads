require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const nums = ['1234567890', '7935422891']; // Fake & maybe real
  const leadOrQuery = nums.map(num => `phone.ilike.%${num}%,secondary_phone.ilike.%${num}%`).join(',');
  console.log("Query:", leadOrQuery);
  const { data, error } = await supabase.from('leads').select('id, name, company, phone, secondary_phone').or(leadOrQuery).limit(5);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
