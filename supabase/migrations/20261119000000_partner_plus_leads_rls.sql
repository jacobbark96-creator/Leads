-- Allow Partner+ clients to read and update leads assigned directly to them
CREATE POLICY "Clients can read assigned leads" ON public.leads
FOR SELECT USING (
    assigned_to = auth.uid()
);

CREATE POLICY "Clients can update assigned leads" ON public.leads
FOR UPDATE USING (
    assigned_to = auth.uid()
);
