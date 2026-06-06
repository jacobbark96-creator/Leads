const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xyz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz');
const channel = supabase.channel('test');
console.log(channel.state);
