-- 1. Add is_rebooking column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_rebooking BOOLEAN DEFAULT false;

-- 2. Update RLS policies to ensure super_admin can update this field
-- Assuming existing policies allow update, but ensuring it's explicit for the new column
-- Supabase handles this automatically if RLS is enabled and policies are correct.

-- 3. Force schema cache reload
NOTIFY pgrst, 'reload schema';
