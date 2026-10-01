import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const entityId = url.searchParams.get('entityId');

    const text = await req.text();
    const params = new URLSearchParams(text);
    const answeredBy = params.get('AnsweredBy');
    const callSid = params.get('CallSid');

    console.log(`[Twilio AMD] Call ${callSid} answered by: ${answeredBy}`);

    // If Twilio detects a voicemail/answering machine, terminate the call
    if (answeredBy && answeredBy.startsWith('machine') && callSid) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (accountSid && authToken) {
        const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
        const updateParams = new URLSearchParams();
        updateParams.append('Status', 'completed');

        // Send hangup request to Twilio REST API
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
          method: 'POST',
          headers: { 
            'Authorization': authHeader, 
            'Content-Type': 'application/x-www-form-urlencoded' 
          },
          body: updateParams.toString()
        });
      }

      // Disposition the lead as Voicemail in lead_pack_memberships if possible
      if (entityId) {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        // Also add a note so it shows in the timeline
        await supabase.from('lead_notes').insert([{
          lead_id: entityId,
          content: `📞 Call by System: Voicemail detected (AMD)`,
          author_name: 'System',
          call_sid: callSid
        }]);

        const { data: membership } = await supabase
          .from('lead_pack_memberships')
          .select('id')
          .eq('lead_id', entityId)
          .is('disposition', null)
          .limit(1)
          .maybeSingle();

        if (membership?.id) {
          await supabase.rpc('complete_lead_in_pack', {
            p_membership_id: membership.id,
            p_disposition: 'Voicemail',
            p_notes: '' 
          });
        }
      }
    }

    return new NextResponse('OK');
  } catch (error) {
    console.error('AMD Callback Error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}