import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { to, body, userId, template, templateData, leadId } = await req.json();
    if (!to || !body || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: user } = await supabase.from('users').select('twilio_number, telnyx_number, name').eq('id', userId).single();
    
    // Get active provider
    const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'communication_provider').single();
    const providerType = setting?.value || 'twilio';

    const normalizeNumber = (num: string) => {
      if (!num) return '';
      let cleaned = num.replace(/[^\d+a-z:]/g, '');
      if (!cleaned.includes('+')) {
        const isWhatsapp = cleaned.startsWith('whatsapp:');
        const numPart = isWhatsapp ? cleaned.replace('whatsapp:', '') : cleaned;
        
        if (numPart.startsWith('0')) {
          const withCode = '+44' + numPart.substring(1);
          cleaned = isWhatsapp ? `whatsapp:${withCode}` : withCode;
        } else if (!numPart.startsWith('44')) {
          const withCode = '+' + numPart;
          cleaned = isWhatsapp ? `whatsapp:${withCode}` : withCode;
        } else {
          const withCode = '+' + numPart;
          cleaned = isWhatsapp ? `whatsapp:${withCode}` : withCode;
        }
      }
      return cleaned;
    };

    let formattedTo = normalizeNumber(to);
    const isWhatsApp = formattedTo.startsWith('whatsapp:');

    let fromNumber = providerType === 'telnyx' ? user?.telnyx_number : user?.twilio_number;
    
    if (!isWhatsApp && !fromNumber) {
      return NextResponse.json({ error: `User does not have a ${providerType} number` }, { status: 400 });
    }

    let formattedFrom = isWhatsApp ? '' : normalizeNumber(fromNumber);
    
    if (isWhatsApp) {
      // Always use the explicit WhatsApp number to avoid Channel errors
      // Force the exact number +447380308873 since the env var might be misconfigured with the boilerplate +1555 number
      let companyNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+447380308873';
      if (companyNumber.includes('1555')) {
        companyNumber = '+447380308873';
      }
      companyNumber = companyNumber.replace(/whatsapp:/g, '');
      formattedFrom = `whatsapp:${companyNumber}`;
    } else if (!isWhatsApp && formattedFrom.startsWith('whatsapp:')) {
      formattedFrom = formattedFrom.replace('whatsapp:', '');
    }

    const host = req.headers.get('host') || 'openlead.co.uk';
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    
    let provider;
    let actualProviderType = providerType;
    
    if (isWhatsApp) {
      const { TwilioProvider } = await import('@/lib/communication/twilio');
      provider = new TwilioProvider();
      actualProviderType = 'twilio';
    } else {
      const { getCommunicationProvider } = await import('@/lib/communication/factory');
      provider = await getCommunicationProvider();
    }

    const statusCallbackUrl = `${protocol}://${host}/api/${actualProviderType}/sms-status`;

    const result = await provider.sendSMS({
      to: formattedTo,
      from: formattedFrom,
      body,
      statusCallback: statusCallbackUrl,
      template,
      templateData
    });

    if (!result.success) {
      // Log the error to the database so we can see it in the UI and debug
      await supabase.from('sms_messages').insert([{
        user_id: userId, 
        contact_number: to, 
        direction: 'outbound',
        body: `[ERROR: ${result.error}] ${body}`, 
        is_read: false, 
        twilio_sid: null, 
        delivery_status: 'failed'
      }]);
      throw new Error(result.error);
    }

    await supabase.from('sms_messages').insert([{
      user_id: userId, 
      contact_number: to, 
      direction: 'outbound',
      body: isWhatsApp && template ? `[Template: ${template}] ${body}` : body, 
      is_read: false, 
      twilio_sid: result.sid, 
      delivery_status: result.status || 'sent'
    }]);

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error: any) {
    console.error('Send SMS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
