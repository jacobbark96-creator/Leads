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
    const answeredBy = params.get('AnsweredBy');
    const recordingUrl = params.get('RecordingUrl');
    const candidateCallSids = Array.from(new Set([
      params.get('DialCallSid'),
      params.get('CallSid'),
      params.get('ParentCallSid')
    ].filter((value): value is string => Boolean(value))));
    const preferredCallSid = params.get('CallSid') || params.get('ParentCallSid') || params.get('DialCallSid');

    if (recordingUrl && entityId && candidateCallSids.length > 0) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const tableName = entityType === 'contractor' ? 'contractor_notes' : 'lead_notes';
      const idField = entityType === 'contractor' ? 'contractor_id' : 'lead_id';
      const normalizedRecordingUrl = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;
      let updated = false;

      for (const callSid of candidateCallSids) {
        const { data: updatedRows, error } = await supabase
          .from(tableName)
          .update({ recording_url: normalizedRecordingUrl })
          .eq('call_sid', callSid)
          .select('id');

        if (error) {
          console.error('Recording Callback Update Error:', error);
          break;
        }

        if (updatedRows && updatedRows.length > 0) {
          updated = true;
          break;
        }
      }

      // Twilio recording callbacks use the parent-leg CallSid for <Dial> recordings.
      // If the original note stored a child leg SID, fall back to the most recent
      // answered system call note for this entity that still lacks a recording.
      if (!updated) {
        const { data: fallbackNote, error: fallbackError } = await supabase
          .from(tableName)
          .select('id')
          .eq(idField, entityId)
          .eq('author_name', 'System')
          .like('content', '📞 Call by %: Answered (%)')
          .is('recording_url', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackError) {
          console.error('Recording Callback Fallback Lookup Error:', fallbackError);
        } else if (fallbackNote?.id) {
          const { error: fallbackUpdateError } = await supabase
            .from(tableName)
            .update({ recording_url: normalizedRecordingUrl, call_sid: preferredCallSid || candidateCallSids[0] || null })
            .eq('id', fallbackNote.id);

          if (fallbackUpdateError) {
            console.error('Recording Callback Fallback Update Error:', fallbackUpdateError);
          }
        }
      }

      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    if (['initiated', 'ringing'].includes(callStatus)) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { 
        headers: { 'Content-Type': 'text/xml' } 
      });
    }

    if (entityId && entityId.trim() !== '') {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      let statusText = callStatus;
      if (callStatus === 'completed') statusText = 'Answered';
      if (callStatus === 'no-answer') statusText = 'No Answer';
      if (callStatus === 'busy') statusText = 'Busy';
      if (callStatus === 'failed') {
        // If the call dropped (e.g. AI closed the WebSocket) but had a duration, it was actually answered
        if (parseInt(duration || '0', 10) > 0 || answeredBy) {
          statusText = 'Answered';
        } else {
          statusText = 'Failed';
        }
      }
      if (callStatus === 'canceled') statusText = 'Canceled';

      // We only insert a note here if it's NOT Voicemail handled by AMD, 
      // but if it's 'completed' and short, AMD might have already inserted a note. 
      // We'll let this insert anyway, it will just say "Answered (X seconds)".
      const noteContent = `📞 Call by ${userName}: ${statusText} (${duration} seconds)`;
      const tableName = entityType === 'contractor' ? 'contractor_notes' : 'lead_notes';
      const idField = entityType === 'contractor' ? 'contractor_id' : 'lead_id';
      const callSid = preferredCallSid || null;

      await supabase.from(tableName).insert([{
        [idField]: entityId,
        content: noteContent,
        author_name: 'System',
        call_sid: callSid
      }]);

      // Disposition in lead_pack_memberships if it was a failed connection (No Answer, Busy, Failed)
      // If it was Answered, the ElevenLabs webhook will handle the disposition later based on AI feedback
      if (entityType === 'lead' && ['No Answer', 'Busy', 'Failed', 'Canceled'].includes(statusText)) {
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
            p_disposition: statusText,
            p_notes: '' 
          });
        }
      }
    }

    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { 
      headers: { 'Content-Type': 'text/xml' } 
    });
  } catch (error: any) {
    console.error('Status Callback Error:', error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, { 
      headers: { 'Content-Type': 'text/xml' } 
    });
  }
}
