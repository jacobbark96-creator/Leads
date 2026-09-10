const { createClient } = require('@supabase/supabase-js');
// load env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
