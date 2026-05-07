import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// The twilio Node.js library uses core Node modules (like crypto, http) that crash in Cloudflare's Edge Runtime.
// We must remove export const runtime = 'edge' here or rewrite it to use raw `fetch` to Twilio's REST API.
// Since we are deploying to Cloudflare Pages, we will rewrite this to use standard fetch() instead of the twilio SDK.
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { to, body, userId } = await req.json();

    if (!to || !body || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get the user's Twilio Number
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('twilio_number')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.twilio_number) {
      return NextResponse.json({ error: 'User does not have a Twilio number assigned.' }, { status: 400 });
    }

    // 2. Send the SMS via Twilio REST API directly (Bypassing twilio SDK to support Edge Runtime)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured on server' }, { status: 500 });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioParams = new URLSearchParams();
    twilioParams.append('To', to);
    twilioParams.append('From', user.twilio_number);
    twilioParams.append('Body', body);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
      },
      body: twilioParams.toString()
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      throw new Error(twilioData.message || 'Twilio API Error');
    }

    // 3. Save to database as outbound message
    const { error: dbError } = await supabase.from('sms_messages').insert([{
      user_id: userId,
      contact_number: to,
      direction: 'outbound',
      body: body,
      is_read: true // Outbound messages are inherently "read"
    }]);

    if (dbError) {
      console.error('Failed to log outbound SMS in DB:', dbError);
    }

    return NextResponse.json({ success: true, messageId: twilioData.sid });
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    return NextResponse.json({ error: error.message || 'Failed to send SMS' }, { status: 500 });
  }
}