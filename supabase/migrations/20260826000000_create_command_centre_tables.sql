-- Migration: Create tables for Command Centre

-- 1. Acquisition Channels
CREATE TABLE IF NOT EXISTS public.acquisition_channels (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 2. Lead Acquisition Sources
CREATE TABLE IF NOT EXISTS public.lead_acquisition_sources (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    channel_id UUID REFERENCES public.acquisition_channels(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    source_type TEXT,
    status TEXT DEFAULT 'active',
    owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    daily_target INTEGER DEFAULT 0,
    monthly_target INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 3. Daily Targets (Company wide)
CREATE TABLE IF NOT EXISTS public.daily_targets (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    target_date DATE NOT NULL UNIQUE,
    target_leads INTEGER DEFAULT 0,
    target_revenue NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 4. Channel Targets
CREATE TABLE IF NOT EXISTS public.channel_targets (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    channel_id UUID REFERENCES public.acquisition_channels(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    target_leads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(channel_id, target_date)
);

-- 5. SDR Targets
CREATE TABLE IF NOT EXISTS public.sdr_targets (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    sdr_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    target_leads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(sdr_id, target_date)
);

-- 6. Production Metrics
CREATE TABLE IF NOT EXISTS public.production_metrics (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    metric_date DATE NOT NULL UNIQUE,
    calls_made INTEGER DEFAULT 0,
    conversations INTEGER DEFAULT 0,
    qualified_conversations INTEGER DEFAULT 0,
    opportunities INTEGER DEFAULT 0,
    generated_leads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 7. Forecast Metrics
CREATE TABLE IF NOT EXISTS public.forecast_metrics (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    forecast_date DATE NOT NULL UNIQUE,
    projected_leads INTEGER DEFAULT 0,
    confidence_level TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 8. Acquisition Costs
CREATE TABLE IF NOT EXISTS public.acquisition_costs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    channel_id UUID REFERENCES public.acquisition_channels(id) ON DELETE CASCADE,
    cost_date DATE NOT NULL,
    spend NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(channel_id, cost_date)
);

-- 9. Lead Quality Metrics
CREATE TABLE IF NOT EXISTS public.lead_quality_metrics (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    metric_date DATE NOT NULL UNIQUE,
    average_quality_score NUMERIC DEFAULT 0,
    qualified_rate NUMERIC DEFAULT 0,
    duplicate_rate NUMERIC DEFAULT 0,
    rejected_rate NUMERIC DEFAULT 0,
    installer_acceptance_rate NUMERIC DEFAULT 0,
    average_lead_value NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- 10. Dashboard Alerts
CREATE TABLE IF NOT EXISTS public.dashboard_alerts (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    alert_type TEXT,
    message TEXT NOT NULL,
    action_type TEXT,
    action_link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Update leads table to link to lead_acquisition_sources
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS acquisition_source_id UUID REFERENCES public.lead_acquisition_sources(id) ON DELETE SET NULL;

-- Enable RLS for all new tables
ALTER TABLE public.acquisition_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_acquisition_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;

-- Create basic policies (allow authenticated users to read/write for now, assuming admin checks in UI/API)
CREATE POLICY "Allow authenticated read" ON public.acquisition_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.acquisition_channels FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.lead_acquisition_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.lead_acquisition_sources FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.daily_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.daily_targets FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.channel_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.channel_targets FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.sdr_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.sdr_targets FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.production_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.production_metrics FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.forecast_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.forecast_metrics FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.acquisition_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.acquisition_costs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.lead_quality_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.lead_quality_metrics FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON public.dashboard_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all" ON public.dashboard_alerts FOR ALL TO authenticated USING (true);
