import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);

    // Fetch Users with Twilio Numbers
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, twilio_number, role')
      .not('twilio_number', 'is', null)
      .neq('twilio_number', '');

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Default to pulling the last 500 calls to process in memory
    const callsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json?PageSize=500`;
    const callsResponse = await fetch(callsUrl, {
      headers: { 'Authorization': authHeader }
    });
    
    if (!callsResponse.ok) {
      const errText = await callsResponse.text();
      console.error('Twilio calls error:', errText);
      return NextResponse.json({ error: 'Failed to fetch calls from Twilio' }, { status: 500 });
    }
    const callsData = await callsResponse.json();
    const calls = callsData.calls || [];

    // Fetch Twilio Recordings (last 500)
    const recordingsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Recordings.json?PageSize=500`;
    const recordingsResponse = await fetch(recordingsUrl, {
      headers: { 'Authorization': authHeader }
    });
    let recordings = [];
    if (recordingsResponse.ok) {
      const recordingsData = await recordingsResponse.json();
      recordings = recordingsData.recordings || [];
    }

    // Map recordings by call_sid
    const recordingMap = new Map();
    recordings.forEach((r: any) => {
      // Create a playable MP3 URL using Basic Auth embedded or just returning the URL
      // Note: Twilio recording URLs require authentication. For a dashboard, it's common
      // to return the .mp3 URL. If the user is logged into Twilio, it plays.
      // A better way is using the secure media endpoint, but for now we return the direct URL.
      // Format: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Recordings/{RecordingSid}.mp3
      const mp3Url = `https://${twilioSid}:${twilioToken}@api.twilio.com${r.uri.replace('.json', '.mp3')}`;
      recordingMap.set(r.call_sid, mp3Url);
    });

    // Build Rep Summaries
    const repSummaries = (users || []).map(user => ({
      id: user.id,
      name: user.name || 'Unknown User',
      twilioNumber: user.twilio_number,
      totalCalls: 0,
      totalDuration: 0, // in seconds initially
      logs: [] as any[]
    }));

    let totalGlobalCalls = 0;
    let totalGlobalDuration = 0;
    const activeUserIds = new Set();

    const normalizeNumber = (num: string) => {
      if (!num) return '';
      return num.startsWith('+') ? num : '+' + num;
    };

    calls.forEach((call: any) => {
      // Find matching rep based on the Twilio number
      const rep = repSummaries.find(r => 
        normalizeNumber(r.twilioNumber) === normalizeNumber(call.from) || 
        normalizeNumber(r.twilioNumber) === normalizeNumber(call.to)
      );
      if (rep) {
        totalGlobalCalls++;
        activeUserIds.add(rep.id);

        const duration = parseInt(call.duration || '0', 10);
        rep.totalCalls++;
        rep.totalDuration += duration;
        totalGlobalDuration += duration;

        const isOutbound = normalizeNumber(call.from) === normalizeNumber(rep.twilioNumber);
        const targetNumber = isOutbound ? call.to : call.from;

        rep.logs.push({
          id: call.sid,
          direction: isOutbound ? 'outbound' : 'inbound',
          to: targetNumber,
          duration: duration,
          status: call.status,
          time: call.start_time,
          recordingUrl: recordingMap.get(call.sid) || null
        });
      }
    });

    // Format durations
    const formatDuration = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}m ${s}s`;
    };

    repSummaries.forEach(rep => {
      // @ts-ignore
      rep.formattedDuration = formatDuration(rep.totalDuration);
      rep.logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()); // newest first
    });

    return NextResponse.json({
      stats: {
        totalCalls: totalGlobalCalls,
        totalDuration: formatDuration(totalGlobalDuration),
        activeUsers: activeUserIds.size
      },
      representatives: repSummaries
    });

  } catch (error: any) {
    console.error('Monitoring API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
