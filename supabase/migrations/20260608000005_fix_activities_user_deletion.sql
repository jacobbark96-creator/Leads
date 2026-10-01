-- Migration: Fix user deletion by adding ON DELETE CASCADE to activities
-- Description: Updates the activities table foreign key to allow users to be deleted even if they have activity logs.

ALTER TABLE public.activities
DROP CONSTRAINT IF EXISTS activities_user_id_fkey;

ALTER TABLE public.activities
ADD CONSTRAINT activities_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;
