const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE TABLE IF NOT EXISTS public.lead_pitches (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
            contractor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            contractor_number TEXT,
            message_body TEXT,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
            rejection_reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        ALTER TABLE public.lead_pitches ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (error) {
      console.error('RPC failed:', error);
      // Let's try using the SQL endpoint if available, but usually we just do this via dashboard
      console.log('Please run the migration SQL directly in the Supabase SQL Editor dashboard');
    } else {
      console.log('Success!', data);
    }
  } catch (err) {
    console.error('Failed:', err);
  }
}

run();
