-- Enhance Openlead Max Availability with booking details
ALTER TABLE public.openlead_max_availability 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS price_at_booking DECIMAL(10, 2);

-- Update RLS policies to ensure consistency
DROP POLICY IF EXISTS "Admins can manage availability" ON public.openlead_max_availability;
CREATE POLICY "Admins can manage availability" ON public.openlead_max_availability
    FOR ALL USING (public.get_auth_user_role() IN ('admin', 'super_admin', 'rep'));
