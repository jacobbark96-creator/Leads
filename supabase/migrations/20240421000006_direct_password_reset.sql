-- Migration: Add secure function for super_admins to update user passwords directly
-- Description: Allows admins to bypass the email flow and manually set passwords.

-- Ensure the pgcrypto extension is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_user_password(user_id UUID, new_password TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    caller_role VARCHAR;
BEGIN
    -- Check the caller's role to ensure only super_admins (or admins) can do this
    SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
    
    IF caller_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can change user passwords directly.';
    END IF;

    -- Update the encrypted password in Supabase's auth.users table
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users (the function itself checks the role)
GRANT EXECUTE ON FUNCTION public.update_user_password(UUID, TEXT) TO authenticated;
