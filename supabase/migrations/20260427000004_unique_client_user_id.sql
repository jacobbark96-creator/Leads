-- Clean up any other duplicates in the database just to be safe
DELETE FROM public.clients a USING (
    SELECT MIN(ctid) as ctid, user_id
    FROM public.clients 
    GROUP BY user_id HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id AND a.ctid <> b.ctid;

-- Add a unique constraint to prevent this from ever happening again
ALTER TABLE public.clients ADD CONSTRAINT clients_user_id_key UNIQUE (user_id);
