import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = 'whatsapp:+15559601534';

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
    const { record: lead } = await req.json();
    
    if (!lead || !lead.id || !lead.is_marketed) {
      return NextResponse.json({ error: 'Invalid lead payload or lead is not marketed' }, { status: 400 });
    }

    if (lead.push_to_whatsapp === false) {
      console.log(`[Broadcast] Skipped WhatsApp broadcast for Lead ID: ${lead.id} (push_to_whatsapp is false)`);
      return NextResponse.json({ message: 'WhatsApp notification skipped by user' });
    }

    console.log(`[Broadcast] Starting broadcast for Lead ID: ${lead.id}`);

    const { data: matchedContractors, error: matchError } = await supabase
      .rpc('get_matched_contractors_for_lead', { p_lead_id: lead.id });

    if (matchError || !matchedContractors || matchedContractors.length === 0) {
      console.log(`[Broadcast] No matched contractors found for lead ${lead.id}`);
      return NextResponse.json({ message: 'No matches found', matchedCount: 0 });
    }

    console.log(`[Broadcast] Found ${matchedContractors.length} potential matches.`);

    const host = req.headers.get('host') || 'openlead.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const dynamicAppUrl = `${protocol}://${host}`;

    const ogImageUrl = new URL(`${dynamicAppUrl}/api/og/whatsapp-lead`);
    ogImageUrl.searchParams.set('ref', lead.id.split('-')[0].toUpperCase());
    ogImageUrl.searchParams.set('exclusivePrice', lead.exclusive_price?.toString() || '185');
    ogImageUrl.searchParams.set('leadsharePrice', lead.share_price?.toString() || '135');
    ogImageUrl.searchParams.set('monthlySpend', lead.monthly_spend?.toString() || 'N/A');
    ogImageUrl.searchParams.set('location', lead.location || 'Unknown');
    ogImageUrl.searchParams.set('systemSize', lead.est_system_size || 'N/A');
    ogImageUrl.searchParams.set('timeframe', lead.timeframe || 'N/A');
    ogImageUrl.searchParams.set('roofSize', lead.roof_size || 'N/A');
    
    if (lead.property_ownership) ogImageUrl.searchParams.set('ownership', lead.property_ownership);
    if (lead.lease_duration) ogImageUrl.searchParams.set('leaseLeft', lead.lease_duration);
    if (lead.electrical_supply) ogImageUrl.searchParams.set('electricalSupply', lead.electrical_supply);
    if (lead.likely_to_renew) ogImageUrl.searchParams.set('likelyToRenew', lead.likely_to_renew);
    if (lead.solar_location) ogImageUrl.searchParams.set('solarLocation', lead.solar_location);
    if (lead.payment_options) ogImageUrl.searchParams.set('paymentOption', lead.payment_options);
    if (lead.unit_rate) ogImageUrl.searchParams.set('unitRate', lead.unit_rate.toString());
    if (lead.est_ann_consumption) ogImageUrl.searchParams.set('annualConsumption', lead.est_ann_consumption.toString());
    
    if (lead.photos && lead.photos.length > 0) {
      ogImageUrl.searchParams.set('photoUrl', lead.photos[0]);
    }

    const finalImageUrl = ogImageUrl.toString();

    if (!accountSid || !authToken) {
      console.warn('[Broadcast] Twilio credentials missing. Skipping actual SMS dispatch.');
      return NextResponse.json({ message: 'Matches found but Twilio not configured', matchedCount: matchedContractors.length, previewUrl: finalImageUrl });
    }

    let sentCount = 0;
    let templateCount = 0;
    const errors = [];

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
        const name = contractor.company_name || contractor.contact_name || 'there';
        const location = lead.location || 'your area';
        const price = lead.exclusive_price || lead.share_price || '185';
        const leadRef = lead.id.split('-')[0].toUpperCase();

        try {
          const templateData: Record<string, string> = {
            '1': name,
            '2': location,
            '3': `£${price}`,
            '4': leadRef
          };

          await sendWhatsAppTemplate(
            whatsappTo,
            twilioPhoneNumber,
            TWILIO_WHATSAPP_TEMPLATE_SID,
            templateData
          );
          
          templateCount++;
          sentCount++;
          console.log(`[Broadcast] Sent template to ${contractor.company_name || contractor.contact_name} (${formattedPhone})`);
          
        } catch (templateErr: any) {
          if (templateErr.message.includes('not a valid ContentSid')) {
            console.warn(`[Broadcast] Template SID not configured. Falling back to freeform message for ${contractor.phone}`);
            
            const messageBody = `Hi ${name},\n\nWe've found a new lead that matches your preferences in ${location}.\n\nInterested? You can view the details below.`;

            await sendTwilioMessage(
              whatsappTo,
              twilioPhoneNumber,
              messageBody,
              finalImageUrl
            );
            
            sentCount++;
            console.log(`[Broadcast] Sent freeform message to ${contractor.company_name || contractor.contact_name} (${formattedPhone})`);
          } else {
            throw templateErr;
          }
        }
        
      } catch (err: any) {
        console.error(`[Broadcast] Failed to send to ${contractor.phone}:`, err.message);
        errors.push({ phone: contractor.phone, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Broadcast complete. Sent ${sentCount} messages (${templateCount} via template).`,
      previewImageUrl: finalImageUrl,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[Broadcast API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
