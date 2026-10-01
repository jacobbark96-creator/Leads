-- Create the ai_calls table to store call metadata and transcripts
CREATE TABLE IF NOT EXISTS public.ai_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT UNIQUE NOT NULL,
    prompt_version TEXT,
    transcript TEXT,
    recording_url TEXT,
    lead_outcome TEXT,
    reviewed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the ai_call_feedback table to store the Anthropic scoring results
CREATE TABLE IF NOT EXISTS public.ai_call_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id TEXT NOT NULL REFERENCES public.ai_calls(call_id) ON DELETE CASCADE,
    prompt_version TEXT,
    overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 5),
    issues JSONB, -- Array of objects: { "category": "...", "severity": "...", "detail": "...", "quote": "..." }
    what_worked_well TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the ai_feedback_reports table to store weekly summary reports
CREATE TABLE IF NOT EXISTS public.ai_feedback_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_text TEXT NOT NULL,
    prompt_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional: Enable RLS (Row Level Security) and add basic policies if needed
ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated/service role full access for backend processing
CREATE POLICY "Allow all access to authenticated users for ai_calls" ON public.ai_calls FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow all access to authenticated users for ai_call_feedback" ON public.ai_call_feedback FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow all access to authenticated users for ai_feedback_reports" ON public.ai_feedback_reports FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
