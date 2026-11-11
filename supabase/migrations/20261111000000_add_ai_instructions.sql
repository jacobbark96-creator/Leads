CREATE TABLE IF NOT EXISTS public.ai_instructions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instruction TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.ai_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage ai instructions" 
ON public.ai_instructions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);
