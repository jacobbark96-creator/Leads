ALTER TABLE public.lead_notes
ADD COLUMN IF NOT EXISTS call_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT;

ALTER TABLE public.contractor_notes
ADD COLUMN IF NOT EXISTS call_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_notes_call_sid ON public.lead_notes(call_sid);
CREATE INDEX IF NOT EXISTS idx_contractor_notes_call_sid ON public.contractor_notes(call_sid);
