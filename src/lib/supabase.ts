import { createClient } from '@supabase/supabase-js';

// We must evaluate these inside a function or component rather than at the module level
// to prevent Next.js from statically baking placeholder values into the client-side bundle.
const getSupabaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
};

const getSupabaseAnonKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
};

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());