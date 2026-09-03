require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('sms_messages').insert([{
    contact_number: 'whatsapp:+441234567890',
    direction: 'inbound',
    body: 'Test schema',
    is_read: false
  }]);
  console.log("Insert Error:", error);
}
run();
