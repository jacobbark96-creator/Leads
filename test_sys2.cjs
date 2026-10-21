const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('system_settings').select('*').limit(1);
    console.log(Object.keys(data[0]));
    
    // Let's try inserting a JSON string into value
    const { data: d2, error: e2 } = await supabase.from('system_settings').upsert({
        key: 'daily_quotes',
        value: JSON.stringify({ "2026-10-19": { quote: "Hello", author: "World" } })
    }, { onConflict: 'key' });
    console.log("Upsert error:", e2);
}
run();
