import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

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

    // 2. Send the SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured on server' }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: body,
      from: user.twilio_number,
      to: to
    });

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

    return NextResponse.json({ success: true, messageId: message.sid });
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    return NextResponse.json({ error: error.message || 'Failed to send SMS' }, { status: 500 });
  }
}