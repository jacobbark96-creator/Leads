-- Create Lead Packs Table
CREATE TABLE IF NOT EXISTS public.lead_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'Layers',
    active_reps_count INTEGER DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    leads_called INTEGER DEFAULT 0,
    leads_remaining INTEGER DEFAULT 0
);

-- Create Lead Pack Memberships Table (Join table for leads in a pack)
CREATE TABLE IF NOT EXISTS public.lead_pack_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_pack_id UUID REFERENCES public.lead_packs(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    assigned_rep_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'uncalled' CHECK (status IN ('uncalled', 'calling', 'called', 'skipped')),
    last_called_at TIMESTAMP WITH TIME ZONE,
    call_attempts INTEGER DEFAULT 0,
    disposition TEXT,
    notes TEXT,
    reserved_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(lead_pack_id, lead_id)
);

-- Create Lead Pack Sessions Table (Tracking reps working on a pack)
CREATE TABLE IF NOT EXISTS public.lead_pack_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rep_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lead_pack_id UUID REFERENCES public.lead_packs(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    leads_called INTEGER DEFAULT 0,
    connected_calls INTEGER DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0
);

-- RLS Policies
ALTER TABLE public.lead_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pack_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_pack_sessions ENABLE ROW LEVEL SECURITY;

-- Admins and super_admins can do everything
CREATE POLICY "Admins can do everything on lead_packs"
    ON public.lead_packs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can do everything on lead_pack_memberships"
    ON public.lead_pack_memberships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can do everything on lead_pack_sessions"
    ON public.lead_pack_sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

-- Sales Reps can read lead_packs
CREATE POLICY "Reps can read lead_packs"
    ON public.lead_packs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('sales_rep', 'admin', 'super_admin')
        )
    );

-- Sales Reps can read and update lead_pack_memberships
CREATE POLICY "Reps can select lead_pack_memberships"
    ON public.lead_pack_memberships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('sales_rep', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Reps can update lead_pack_memberships"
    ON public.lead_pack_memberships FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('sales_rep', 'admin', 'super_admin')
        )
    );

-- Sales Reps can manage their own sessions
CREATE POLICY "Reps can manage own sessions"
    ON public.lead_pack_sessions FOR ALL
    USING (rep_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_pack_memberships_pack_id ON public.lead_pack_memberships(lead_pack_id);
CREATE INDEX IF NOT EXISTS idx_lead_pack_memberships_lead_id ON public.lead_pack_memberships(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pack_memberships_status ON public.lead_pack_memberships(status);
CREATE INDEX IF NOT EXISTS idx_lead_pack_memberships_reserved_until ON public.lead_pack_memberships(reserved_until);
CREATE INDEX IF NOT EXISTS idx_lead_pack_sessions_pack_id ON public.lead_pack_sessions(lead_pack_id);
CREATE INDEX IF NOT EXISTS idx_lead_pack_sessions_rep_id ON public.lead_pack_sessions(rep_id);