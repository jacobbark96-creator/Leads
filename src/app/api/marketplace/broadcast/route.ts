import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Removed 'edge' runtime to allow Node.js environment variables resolution on Vercel build
export const runtime = 'edge';

// We initialize Supabase lazily to avoid build-time errors when env vars are missing
const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioEnvNumber = process.env.TWILIO_PHONE_NUMBER || '';
const twilioPhoneNumber = twilioEnvNumber.startsWith('whatsapp:') ? twilioEnvNumber : `whatsapp:${twilioEnvNumber}`;

const TWILIO_WHATSAPP_TEMPLATE_SID = process.env.TWILIO_WHATSAPP_TEMPLATE_SID || 'HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://openlead.com';

async function sendTwilioMessage(to: string, from: string, body: string, mediaUrl?: string) {
  if (!accountSid || !authToken) return null;
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);
  
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', from);
  formData.append('Body', body);
  if (mediaUrl) {
    formData.append('MediaUrl', mediaUrl);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Twilio API error: ${response.status} ${response.statusText} - ${errText}`);
  }
  
  return await response.json();
}

async function sendWhatsAppTemplate(
  to: string, 
  from: string, 
  templateSid: string, 
  templateData: Record<string, string>
) {
  if (!accountSid || !authToken) return null;
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);
  
  const contentVariables: Record<string, string> = {};
  Object.entries(templateData).forEach(([key, value], idx) => {
    contentVariables[`${idx + 1}`] = value;
  });
  
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', from);
  formData.append('ContentSid', templateSid);
  formData.append('ContentVariables', JSON.stringify(contentVariables));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Twilio API error: ${response.status} ${response.statusText} - ${errText}`);
  }
  
  return await response.json();
}

export async function POST(req: NextRequest) {
  try {
    const { record: lead, selectedContractorIds } = await req.json();
    
    if (!lead || !lead.id || !lead.is_marketed) {
      return NextResponse.json({ error: 'Invalid lead payload or lead is not marketed' }, { status: 400 });
    }

    if (lead.push_to_whatsapp === false) {
      console.log(`[Broadcast] Skipped WhatsApp broadcast for Lead ID: ${lead.id} (push_to_whatsapp is false)`);
      return NextResponse.json({ message: 'WhatsApp notification skipped by user' });
    }

    console.log(`[Broadcast] Starting broadcast for Lead ID: ${lead.id}`);

    const supabase = getSupabase();

    const { data: allMatchedContractors, error: matchError } = await supabase
      .rpc('get_matched_contractors_for_lead', { p_lead_id: lead.id });

    if (matchError || !allMatchedContractors || allMatchedContractors.length === 0) {
      console.log(`[Broadcast] No matched contractors found for lead ${lead.id}`);
      return NextResponse.json({ message: 'No matches found', matchedCount: 0 });
    }

    // Filter by selected contractors from the frontend
    const matchedContractors = selectedContractorIds 
      ? allMatchedContractors.filter((c: any) => selectedContractorIds.includes(c.id))
      : allMatchedContractors;

    if (matchedContractors.length === 0) {
      console.log(`[Broadcast] No contractors selected for lead ${lead.id}`);
      return NextResponse.json({ message: 'No contractors selected', matchedCount: 0 });
    }

    console.log(`[Broadcast] Found ${matchedContractors.length} selected matches.`);

    if (!accountSid || !authToken) {
      console.warn('[Broadcast] Twilio credentials missing. Skipping actual SMS dispatch.');
      return NextResponse.json({ message: 'Matches found but Twilio not configured', matchedCount: matchedContractors.length });
    }

    let sentCount = 0;
    const errors = [];
    
    // Generate the dynamic write-up image URL
    const town = lead.location || lead.town || lead.city || 'your area';
    const type = lead.lead_type || 'Residential';
    const system = lead.system_size || 'Solar PV';
    const price = lead.exclusive_price || lead.share_price || '185';
    const notes = encodeURIComponent(lead.notes || lead.requirements || 'No specific details provided.');
    
    const host = req.headers.get('host') || 'openlead.co.uk';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // Create the OG image URL
    const mediaUrl = `${protocol}://${host}/api/og/lead-writeup?town=${encodeURIComponent(town)}&type=${encodeURIComponent(type)}&system=${encodeURIComponent(system)}&price=${encodeURIComponent(price)}&notes=${notes}`;

    const messageBody = `New lead in ${town} just hit the market`;

    for (const contractor of matchedContractors) {
      try {
        let formattedPhone = contractor.phone.replace(/[^0-9+]/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+44' + formattedPhone.slice(1);
        } else if (!formattedPhone.startsWith('+')) {
          if (formattedPhone.startsWith('44')) {
            formattedPhone = '+' + formattedPhone;
          } else {
            formattedPhone = '+44' + formattedPhone;
          }
        }

        const whatsappTo = `whatsapp:${formattedPhone}`;

        // If a real Template SID is provided, use the Twilio Content API to comply with the 24-hour rule
        if (TWILIO_WHATSAPP_TEMPLATE_SID && !TWILIO_WHATSAPP_TEMPLATE_SID.startsWith('HXXX')) {
          await sendWhatsAppTemplate(
            whatsappTo,
            twilioPhoneNumber,
            TWILIO_WHATSAPP_TEMPLATE_SID,
            { town, mediaUrl } // Maps to {{1}} and {{2}} in Twilio Content API
          );
          console.log(`[Broadcast] Sent WhatsApp TEMPLATE message to ${contractor.company_name || contractor.contact_name} (${formattedPhone})`);
        } else {
          // Fallback to standard messaging (only works if 24h session is open or matches exact template string)
          await sendTwilioMessage(
            whatsappTo,
            twilioPhoneNumber,
            messageBody,
            mediaUrl
          );
          console.log(`[Broadcast] Sent custom WhatsApp message with media to ${contractor.company_name || contractor.contact_name} (${formattedPhone})`);
        }
        
        sentCount++;
        
      } catch (err: any) {
        console.error(`[Broadcast] Failed to send to ${contractor.phone}:`, err.message);
        errors.push({ phone: contractor.phone, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Broadcast complete. Sent ${sentCount} messages.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[Broadcast API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
