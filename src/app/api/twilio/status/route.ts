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
    const recordingUrl = params.get('RecordingUrl');
    const candidateCallSids = Array.from(new Set([
      params.get('DialCallSid'),
      params.get('CallSid'),
      params.get('ParentCallSid')
    ].filter((value): value is string => Boolean(value))));

    if (recordingUrl && entityId && candidateCallSids.length > 0) {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const tableName = entityType === 'contractor' ? 'contractor_notes' : 'lead_notes';
      const normalizedRecordingUrl = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;

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
          break;
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
      if (callStatus === 'failed') statusText = 'Failed';
      if (callStatus === 'canceled') statusText = 'Canceled';

      const noteContent = `📞 Call by ${userName}: ${statusText} (${duration} seconds)`;
      const tableName = entityType === 'contractor' ? 'contractor_notes' : 'lead_notes';
      const idField = entityType === 'contractor' ? 'contractor_id' : 'lead_id';
      const callSid = candidateCallSids[0] || null;

      await supabase.from(tableName).insert([{
        [idField]: entityId,
        content: noteContent,
        author_name: 'System',
        call_sid: callSid
      }]);
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
