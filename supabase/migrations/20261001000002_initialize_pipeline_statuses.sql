-- Initialize sales_pipeline_status based on lead status
UPDATE public.leads
SET sales_pipeline_status = 'Upcoming'
WHERE sales_pipeline_status IS NULL
AND status IN ('qualified', 'marketplace', 'awaiting_sales', 'fresh', 'voicemail', 'no answer');

UPDATE public.leads
SET sales_pipeline_status = 'Sold'
WHERE sales_pipeline_status IS NULL
AND (status = 'sold' OR purchase_count > 0);

UPDATE public.leads
SET sales_pipeline_status = 'Lost'
WHERE sales_pipeline_status IS NULL
AND status IN ('lost', 'archive', 'skipped');

-- Initialize gm_pipeline_status
UPDATE public.leads
SET gm_pipeline_status = 'Callbacks'
WHERE gm_pipeline_status IS NULL
AND status = 'call back';

UPDATE public.leads
SET gm_pipeline_status = 'Signed Up'
WHERE gm_pipeline_status IS NULL
AND (status = 'sold' OR purchase_count > 0);

-- Initialize bd_pipeline_status
UPDATE public.leads
SET bd_pipeline_status = 'Fresh'
WHERE bd_pipeline_status IS NULL
AND status = 'fresh';

UPDATE public.leads
SET bd_pipeline_status = 'Market'
WHERE bd_pipeline_status IS NULL
AND status = 'marketplace';

UPDATE public.leads
SET bd_pipeline_status = 'Sold'
WHERE bd_pipeline_status IS NULL
AND (status = 'sold' OR purchase_count > 0);
