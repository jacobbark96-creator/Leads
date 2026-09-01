import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Telnyx webhooks follow a specific structure: { data: { event_type, payload: { id, status, ... } } }
    const eventType = body.data?.event_type;
    const payload = body.data?.payload;

    if (payload && payload.id) {
      const messageId = payload.id;
      const status = payload.status;
      
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      
      const updateData: any = { delivery_status: status };
      
      // Map Telnyx statuses to our internal statuses if needed
      // Telnyx statuses: queued, sending, sent, delivered, undelivered, failed
      if (status === 'delivered') {
        // We don't have a specific 'read' status from Telnyx SMS usually, 
        // but we can mark it as delivered.
      }

      await supabase
        .from('sms_messages')
        .update(updateData)
        .eq('twilio_sid', messageId); // Reusing twilio_sid column for provider SIDs
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Telnyx Webhook Error:', error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
