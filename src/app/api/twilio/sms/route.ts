import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    
    const fromNumber = params.get('From');
    const toNumber = params.get('To');
    const messageBody = params.get('Body');

    if (!fromNumber || !toNumber || !messageBody) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Find which user owns the "To" number (twilio_number)
    // Twilio formats numbers like +447... so we should check for endsWith or exact match
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, twilio_number');
      
    if (userError || !users) {
      console.error('Error fetching users for SMS routing:', userError);
    } else {
      // Find the user. We strip whitespace and possibly the + sign to match robustly
      const cleanTo = toNumber.replace(/[^0-9]/g, '');
      const user = users.find(u => u.twilio_number && u.twilio_number.replace(/[^0-9]/g, '') === cleanTo);
      
      if (user) {
        // Insert into sms_messages
        await supabase.from('sms_messages').insert([{
          user_id: user.id,
          contact_number: fromNumber,
          direction: 'inbound',
          body: messageBody,
          is_read: false
        }]);
      } else {
        console.warn('Received SMS to unassigned Twilio number:', toNumber);
      }
    }

    // Return empty TwiML to Twilio
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error processing inbound SMS:', error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}