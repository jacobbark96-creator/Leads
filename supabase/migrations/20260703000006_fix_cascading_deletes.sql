-- Fix foreign key constraints to ensure full cascading deletion of users
-- This prevents "email already exists" errors when trying to re-invite a deleted user

-- 1. Internal Messages & Group Members
ALTER TABLE public.internal_group_members
DROP CONSTRAINT IF EXISTS internal_group_members_user_id_fkey,
ADD CONSTRAINT internal_group_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.internal_messages
DROP CONSTRAINT IF EXISTS internal_messages_sender_id_fkey,
ADD CONSTRAINT internal_messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.internal_messages
DROP CONSTRAINT IF EXISTS internal_messages_receiver_id_fkey,
ADD CONSTRAINT internal_messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Reminders
ALTER TABLE public.lead_reminders
DROP CONSTRAINT IF EXISTS lead_reminders_user_id_fkey,
ADD CONSTRAINT lead_reminders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.contractor_reminders
DROP CONSTRAINT IF EXISTS contractor_reminders_user_id_fkey,
ADD CONSTRAINT contractor_reminders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Lead Packs & Memberships
ALTER TABLE public.lead_pack_memberships
DROP CONSTRAINT IF EXISTS lead_pack_memberships_assigned_rep_id_fkey,
ADD CONSTRAINT lead_pack_memberships_assigned_rep_id_fkey
    FOREIGN KEY (assigned_rep_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.lead_pack_sessions
DROP CONSTRAINT IF EXISTS lead_pack_sessions_rep_id_fkey,
ADD CONSTRAINT lead_pack_sessions_rep_id_fkey
    FOREIGN KEY (rep_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Partner Clicks & Likes
ALTER TABLE public.partner_clicks
DROP CONSTRAINT IF EXISTS partner_clicks_user_id_fkey,
ADD CONSTRAINT partner_clicks_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.liked_leads
DROP CONSTRAINT IF EXISTS liked_leads_user_id_fkey,
ADD CONSTRAINT liked_leads_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Self-referencing parent_id
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_parent_id_fkey,
ADD CONSTRAINT users_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
