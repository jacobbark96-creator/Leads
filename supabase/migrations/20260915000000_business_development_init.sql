-- 1. Update email_templates type enum
-- First, we need to check if the type is a text or a domain/enum.
-- Based on the UI, it's treated as a string with specific values.
-- We'll add a check constraint update if necessary, but typically it's just a text column.

-- 2. Add bd_pipeline_status to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS bd_pipeline_status TEXT DEFAULT NULL;

-- 3. Create the Business Development Pack if it doesn't exist
INSERT INTO public.lead_packs (name, description, status, color, icon)
SELECT 'Business Development', 'Pipeline for Business Development leads', 'active', '#8B5CF6', 'Briefcase'
WHERE NOT EXISTS (SELECT 1 FROM public.lead_packs WHERE name = 'Business Development');

-- 4. Seed Email Templates
INSERT INTO public.email_templates (name, subject, body, type)
VALUES 
('Intro Email', 'Introduction to Openlead - {{Company}}', '<p>Hi {{Name}},</p><p>I wanted to introduce you to Openlead. We noticed your roof size is {{Roof size}} and we think we can help.</p><p>Best regards,</p>', 'intro'),
('Follow Up', 'Following up on our intro', '<p>Hi {{Name}},</p><p>Just following up on my previous email regarding the solar potential for your property at {{Location}}.</p><p>Best regards,</p>', 'follow'),
('Chase Up', 'Quick question regarding your solar inquiry', '<p>Hi {{Name}},</p><p>I haven''t heard back from you. Are you still interested in exploring solar options for {{Company}}?</p><p>Best regards,</p>', 'chase')
ON CONFLICT DO NOTHING;
