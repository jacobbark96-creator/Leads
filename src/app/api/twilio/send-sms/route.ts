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
    const { data: user } = await supabase.from('users').select('twilio_number, name').eq('id', userId).single();
    if (!user?.twilio_number) {
      return NextResponse.json({ error: 'User does not have a Twilio number' }, { status: 400 });
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials missing' }, { status: 500 });
    }

    let fromNumber = user.twilio_number;
    
    const normalizeNumber = (num: string) => {
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
    let formattedFrom = normalizeNumber(fromNumber);

    const isWhatsApp = formattedTo.startsWith('whatsapp:');
    
    if (isWhatsApp) {
      formattedFrom = 'whatsapp:+15559601534'; // Company WhatsApp number
    } else if (!isWhatsApp && formattedFrom.startsWith('whatsapp:')) {
      formattedFrom = formattedFrom.replace('whatsapp:', '');
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const statusCallbackUrl = `${protocol}://${host}/api/twilio/sms-status`;

    const params = new URLSearchParams();
    params.append('To', formattedTo);
    params.append('From', formattedFrom);
    params.append('StatusCallback', statusCallbackUrl);

    if (isWhatsApp && template && templateData && template.length > 0) {
      params.append('ContentSid', template);
      const contentVariables: Record<string, string> = {};
      let idx = 1;
      for (const val of templateData) {
        if (val !== undefined && val !== null) {
          contentVariables[`${idx}`] = String(val);
        }
        idx++;
      }
      if (Object.keys(contentVariables).length > 0) {
        params.append('ContentVariables', JSON.stringify(contentVariables));
      }
    } else {
      params.append('Body', body);
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`), 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: params
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }
    
    const data = await response.json();

    await supabase.from('sms_messages').insert([{
      user_id: userId, 
      contact_number: to, 
      direction: 'outbound',
      body: isWhatsApp && template ? `[Template: ${template}] ${body}` : body, 
      is_read: true, 
      twilio_sid: data.sid, 
      delivery_status: data.status || 'sent'
    }]);

    return NextResponse.json({ success: true, sid: data.sid });
  } catch (error: any) {
    console.error('Send SMS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
