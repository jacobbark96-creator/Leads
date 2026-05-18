export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass RLS for background jobs
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Twilio Client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+15559601534'; // Official Openlead Number

// The base URL of your application (for the OG image)
// Fallback to ngrok/localtunnel for local testing of Twilio Media URLs
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://openlead.com';

// Helper function to send Twilio message using native fetch (Edge compatible)
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
    throw new Error(`Twilio API error: ${response.statusText}`);
  }
  
  return await response.json();
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Request Authorization (Basic security for internal webhook)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      // In production, ensure INTERNAL_API_SECRET is set in both Supabase Webhooks and Vercel Env
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Lead Data
    const { record: lead } = await req.json();
    
    if (!lead || !lead.id || !lead.is_marketed) {
      return NextResponse.json({ error: 'Invalid lead payload or lead is not marketed' }, { status: 400 });
    }

    if (lead.push_to_whatsapp === false) {
      console.log(`[Broadcast] Skipped WhatsApp broadcast for Lead ID: ${lead.id} (push_to_whatsapp is false)`);
      return NextResponse.json({ message: 'WhatsApp notification skipped by user' });
    }

    console.log(`[Broadcast] Starting broadcast for Lead ID: ${lead.id}`);

    // 3. The Matching Engine
    // Use the RPC to precisely find contractors matching category and service area radius
    const { data: matchedContractors, error: matchError } = await supabase
      .rpc('get_matched_contractors_for_lead', { p_lead_id: lead.id });

    if (matchError || !matchedContractors || matchedContractors.length === 0) {
      console.log(`[Broadcast] No matched contractors found for lead ${lead.id}`);
      return NextResponse.json({ message: 'No matches found', matchedCount: 0 });
    }

    console.log(`[Broadcast] Found ${matchedContractors.length} potential matches.`);

    // 4. Construct the OG Image URL
    // We pass the lead's specific data as query parameters to our dynamic image generator
    const ogImageUrl = new URL(`${appUrl}/api/og/whatsapp-lead`);
    ogImageUrl.searchParams.set('ref', lead.id.split('-')[0].toUpperCase());
    ogImageUrl.searchParams.set('exclusivePrice', lead.exclusive_price?.toString() || '185');
    ogImageUrl.searchParams.set('leadsharePrice', lead.share_price?.toString() || '135');
    ogImageUrl.searchParams.set('monthlySpend', lead.monthly_spend?.toString() || 'N/A');
    ogImageUrl.searchParams.set('location', lead.location || 'Unknown');
    ogImageUrl.searchParams.set('systemSize', lead.est_system_size || 'N/A');
    ogImageUrl.searchParams.set('timeframe', lead.timeframe || 'N/A');
    ogImageUrl.searchParams.set('roofSize', lead.roof_size || 'N/A');
    
    // Additional specs
    if (lead.property_ownership) ogImageUrl.searchParams.set('ownership', lead.property_ownership);
    if (lead.lease_duration) ogImageUrl.searchParams.set('leaseLeft', lead.lease_duration);
    if (lead.electrical_supply) ogImageUrl.searchParams.set('electricalSupply', lead.electrical_supply);
    if (lead.likely_to_renew) ogImageUrl.searchParams.set('likelyToRenew', lead.likely_to_renew);
    if (lead.solar_location) ogImageUrl.searchParams.set('solarLocation', lead.solar_location);
    if (lead.payment_options) ogImageUrl.searchParams.set('paymentOption', lead.payment_options);
    if (lead.unit_rate) ogImageUrl.searchParams.set('unitRate', lead.unit_rate.toString());
    if (lead.est_ann_consumption) ogImageUrl.searchParams.set('annualConsumption', lead.est_ann_consumption.toString());
    
    // Get primary photo if exists
    if (lead.photos && lead.photos.length > 0) {
      ogImageUrl.searchParams.set('photoUrl', lead.photos[0]);
    }

    const finalImageUrl = ogImageUrl.toString();

    // 5. Send WhatsApp Messages
    if (!accountSid || !authToken) {
      console.warn('[Broadcast] Twilio credentials missing. Skipping actual SMS dispatch.');
      return NextResponse.json({ message: 'Matches found but Twilio not configured', matchedCount: matchedContractors.length, previewUrl: finalImageUrl });
    }

    let sentCount = 0;
    const errors = [];

    for (const contractor of matchedContractors) {
      try {
        // Ensure phone number is in E.164 format (e.g., +447123456789)
        let formattedPhone = contractor.phone;
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+44' + formattedPhone.slice(1);
        }

        // Send the message via Twilio using native fetch instead of SDK
        await sendTwilioMessage(
          `whatsapp:${formattedPhone}`,
          twilioPhoneNumber,
          `Hi ${contractor.company_name || contractor.contact_name || 'there'},\n\nWe've found a new lead that matches your preferences in ${lead.location || 'your area'}.\n\nInterested? You can view the details below.`,
          finalImageUrl
        );
        
        sentCount++;
        console.log(`[Broadcast] Sent to ${contractor.company_name || contractor.contact_name} (${formattedPhone})`);
        
      } catch (err: any) {
        console.error(`[Broadcast] Failed to send to ${contractor.phone}:`, err.message);
        errors.push({ phone: contractor.phone, error: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Broadcast complete. Sent ${sentCount} messages.`,
      previewImageUrl: finalImageUrl,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[Broadcast API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}