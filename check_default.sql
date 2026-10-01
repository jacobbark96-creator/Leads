SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'enrichment_status';
