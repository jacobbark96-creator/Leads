ALTER TABLE public.sms_messages 
ADD COLUMN twilio_sid VARCHAR(255),
ADD COLUMN delivery_status VARCHAR(50) DEFAULT 'sent';
