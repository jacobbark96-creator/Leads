const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_client_monitoring_stats');
  if (data) {
    for (let stat of data) {
      if (stat.last_login) {
        try {
          const d = new Date(stat.last_login);
          if (isNaN(d.getTime())) console.log("Invalid date found:", stat.last_login);
        } catch (e) {
          console.log("Error date:", stat.last_login);
        }
      }
    }
  }
}
run();
