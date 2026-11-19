import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);

    // Fetch incoming numbers from Twilio
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json?PageSize=1000`, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch numbers from Twilio');
    }

    const data = await response.json();
    const twilioNumbers = data.incoming_phone_numbers || [];

    // Fetch users with twilio_number
    const { data: users, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, name, twilio_number')
      .not('twilio_number', 'is', null)
      .neq('twilio_number', '');

    if (dbError) {
      console.error('Error fetching users:', dbError);
    }

    // Map numbers to users
    const result = twilioNumbers.map((num: any) => {
      // Find matching user (strip spaces/symbols to compare)
      const cleanTwilioNum = num.phone_number.replace(/[^\d+]/g, '');
      const assignedUser = users?.find(u => {
        if (!u.twilio_number) return false;
        const cleanUserNum = u.twilio_number.replace(/[^\d+]/g, '');
        return cleanUserNum === cleanTwilioNum || cleanUserNum.endsWith(cleanTwilioNum.replace('+', ''));
      });

      return {
        sid: num.sid,
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name,
        dateCreated: num.date_created,
        assignedUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name } : null
      };
    });

    return NextResponse.json({ numbers: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sid = searchParams.get('sid');
    
    if (!sid) {
      return NextResponse.json({ error: 'Missing sid' }, { status: 400 });
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers/${sid}.json`, {
      method: 'DELETE',
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete number from Twilio');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
