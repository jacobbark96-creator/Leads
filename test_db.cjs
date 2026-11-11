const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let allCalls = [];
  let page = 0;
  while(true) {
     const { data } = await supabase.from('lead_notes')
        .select('user_id, content')
        .gte('created_at', today.toISOString())
        .ilike('content', '%📞 Call by%')
        .range(page * 1000, (page + 1) * 1000 - 1);
     if (!data || data.length === 0) break;
     allCalls = allCalls.concat(data);
     page++;
  }
  
  console.log("Total call notes fetched:", allCalls.length);
  
  // Aggregate
  const callsByUser = {};
  allCalls.forEach(c => {
     if (!callsByUser[c.user_id]) callsByUser[c.user_id] = [];
     callsByUser[c.user_id].push(c);
  });
  
  const { data: users } = await supabase.from('users').select('id, name').in('id', Object.keys(callsByUser));
  
  users.forEach(u => {
     const calls = callsByUser[u.id];
     // Alyan and Rachel
     if (u.name.includes('Alyan') || u.name.includes('Rachel')) {
         console.log(u.name, "Dials:", calls.length);
     }
  });
}
test();
