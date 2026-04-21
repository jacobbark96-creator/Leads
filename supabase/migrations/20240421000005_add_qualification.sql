-- Migration: Add qualification fields, marketed flag, and photo storage bucket
-- Description: Adds all necessary fields for a lead to be qualified and marketed to the client portal.

ALTER TABLE public.leads 
ADD COLUMN monthly_spend NUMERIC,
ADD COLUMN location VARCHAR,
ADD COLUMN timeframe VARCHAR,
ADD COLUMN roof_condition VARCHAR,
ADD COLUMN roof_material VARCHAR,
ADD COLUMN cover_skylights BOOLEAN DEFAULT false,
ADD COLUMN ground_mount BOOLEAN DEFAULT false,
ADD COLUMN unit_rate NUMERIC,
ADD COLUMN est_ann_consumption NUMERIC,
ADD COLUMN qualification_notes TEXT,
ADD COLUMN est_system_size VARCHAR,
ADD COLUMN photos TEXT[] DEFAULT '{}',
ADD COLUMN is_marketed BOOLEAN DEFAULT false;

-- Insert the storage bucket for lead photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead-photos', 'lead-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for public read and authenticated insert
CREATE POLICY "Public Read Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'lead-photos');

CREATE POLICY "Authenticated Insert Access" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'lead-photos' AND auth.role() = 'authenticated');
