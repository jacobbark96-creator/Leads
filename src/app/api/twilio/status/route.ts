import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const entityId = url.searchParams.get('entityId');
    const userName = url.searchParams.get('userName') || 'A User';
    const entityType = url.searchParams.get('entityType') || 'lead';

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    
    const callStatus = params.get('DialCallStatus') || params.get('CallStatus') || 'unknown';
    const duration = params.get('DialCallDuration') || params.get('CallDuration') || '0';

    if (entityId && entityId.trim() !== '') {
      // Initialize Supabase Admin Client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Needs to bypass RLS

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let statusText = callStatus;
        if (callStatus === 'completed') statusText = 'Answered';
        if (callStatus === 'no-answer') statusText = 'No Answer';
        if (callStatus === 'busy') statusText = 'Busy';
        if (callStatus === 'failed') statusText = 'Failed';

        const noteContent = `📞 Call by ${userName}: ${statusText} (${duration} seconds)`;
        
        const table = entityType === 'contractor' ? 'contractors' : 'leads';

        // Fetch existing notes
        const { data: entityData } = await supabase
          .from(table)
          .select('notes')
          .eq('id', entityId)
          .single();

        let existingNotes = [];
        if (entityData && entityData.notes) {
          try {
            existingNotes = typeof entityData.notes === 'string' ? JSON.parse(entityData.notes) : entityData.notes;
          } catch (e) {
            existingNotes = [];
          }
        }

        const newNote = {
          id: crypto.randomUUID(),
          content: noteContent,
          author_name: 'System',
          created_at: new Date().toISOString()
        };

        const updatedNotes = [...existingNotes, newNote];

        await supabase
          .from(table)
          .update({ notes: updatedNotes })
          .eq('id', entityId);
      }
    }

    // Return empty TwiML to gracefully end the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error: any) {
    console.error('Error handling Twilio status callback:', error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { 
      headers: { 'Content-Type': 'text/xml' } 
    });
  }
}
