import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const channel = supabase.channel('online-users');

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  console.log("Current presences in 'online-users':", JSON.stringify(state, null, 2));
  process.exit(0);
});

channel.subscribe((status) => {
  console.log("Status:", status);
});
