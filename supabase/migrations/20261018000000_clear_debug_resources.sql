-- Remove all webhook payload debug resources from the intranet
DELETE FROM public.intranet_resources
WHERE title = 'Webhook Payload Debug';
