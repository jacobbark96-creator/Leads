-- Revert and fix with JWT metadata to avoid recursion
DROP POLICY IF EXISTS "Parents can read child user data" ON public.users;
DROP POLICY IF EXISTS "Children can read parent user data" ON public.users;
DROP POLICY IF EXISTS "Parents can read child client profiles" ON public.clients;
DROP POLICY IF EXISTS "Children can read parent client profiles" ON public.clients;

-- 1. Parents can read their children's user rows
CREATE POLICY "Parents can read child user data" ON public.users 
    FOR SELECT USING (parent_id = auth.uid());

-- 2. Children can read their parent's user row (using JWT metadata to avoid recursion)
CREATE POLICY "Children can read parent user data" ON public.users 
    FOR SELECT USING (
        id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
    );

-- 3. Parents can read their children's client profiles
CREATE POLICY "Parents can read child client profiles" ON public.clients 
    FOR SELECT USING (
        user_id IN (SELECT id FROM public.users WHERE parent_id = auth.uid())
    );

-- 4. Children can read their parent's client profile (using JWT metadata)
CREATE POLICY "Children can read parent client profiles" ON public.clients 
    FOR SELECT USING (
        user_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
    );
