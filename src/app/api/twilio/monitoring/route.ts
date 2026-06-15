import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioSid || !twilioToken) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, twilio_number, role')
      .not('twilio_number', 'is', null)
      .neq('twilio_number', '');

    if (usersError) return NextResponse.json({ error: 'Database error' }, { status: 500 });

    const url = new URL(request.url);
    const dateRange = url.searchParams.get('dateRange') || 'total';

    let startTimeFilter = '';
    const now = new Date();
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startTimeFilter = `&StartTime>=${today.toISOString().split('T')[0]}`;
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startTimeFilter = `&StartTime>=${weekAgo.toISOString().split('T')[0]}`;
    } else if (dateRange === 'month') {
      const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startTimeFilter = `&StartTime>=${twentyNineDaysAgo.toISOString().split('T')[0]}`;
    } else if (dateRange === 'total') {
      const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      startTimeFilter = `&StartTime>=${twentyNineDaysAgo.toISOString().split('T')[0]}`;
    }

    const callsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json?PageSize=500${startTimeFilter}`;
    const recordingsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Recordings.json?PageSize=500${startTimeFilter.replace('StartTime', 'DateCreated')}`;
    const balanceUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Balance.json`;

    const [callsResponse, recordingsResponse, balanceResponse] = await Promise.all([
      fetch(callsUrl, { headers: { 'Authorization': authHeader } }),
      fetch(recordingsUrl, { headers: { 'Authorization': authHeader } }),
      fetch(balanceUrl, { headers: { 'Authorization': authHeader } })
    ]);

    if (!callsResponse.ok) return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
    
    const callsData = await callsResponse.json();
    const calls = callsData.calls || [];

    let recordings = [];
    if (recordingsResponse.ok) {
      const recordingsData = await recordingsResponse.json();
      recordings = recordingsData.recordings || [];
    }

    let balance = '0.00';
    let currency = 'USD';
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      balance = balanceData.balance || '0.00';
      currency = balanceData.currency || 'USD';
    }

    const recordingMap = new Map();
    recordings.forEach((r: any) => {
      const cleanUrl = `https://api.twilio.com${r.uri.replace('.json', '.mp3')}`;
      const proxyUrl = `/api/twilio/media?url=${encodeURIComponent(cleanUrl)}`;
      recordingMap.set(r.call_sid, proxyUrl);
    });

    const repSummaries = (users || []).map(user => ({
      id: user.id,
      name: user.name || 'Unknown User',
      twilioNumber: user.twilio_number,
      totalCalls: 0,
      totalDuration: 0,
      logs: [] as any[]
    }));

    let totalGlobalCalls = 0;
    let totalGlobalDuration = 0;
    const activeUserIds = new Set();

    const normalizeNumber = (num: string) => {
      if (!num) return '';
      let cleaned = num.replace(/[^\d+]/g, '');
      if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
        cleaned = '+44' + cleaned.substring(1);
      }
      if (cleaned && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
      }
      return cleaned;
    };

    const uniqueTargetNumbers = new Set<string>();

    calls.forEach((call: any) => {
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
        if (targetNumber) {
          uniqueTargetNumbers.add(targetNumber);
        }

        rep.logs.push({
          id: call.sid,
          direction: isOutbound ? 'outbound' : 'inbound',
          to: targetNumber,
          duration: duration,
          status: call.status,
          time: call.start_time,
          recordingUrl: recordingMap.get(call.sid) || (call.parent_call_sid ? recordingMap.get(call.parent_call_sid) : null) || null
        });
      }
    });

    let matchedEntities: any[] = [];
    const targetNumbersArray = Array.from(uniqueTargetNumbers);
    const last10Digits = targetNumbersArray
      .map(num => num.replace(/[^\d]/g, '').slice(-10))
      .filter(n => n.length >= 7);

    if (last10Digits.length > 0) {
      const chunks = [];
      for (let i = 0; i < last10Digits.length; i += 10) {
        chunks.push(last10Digits.slice(i, i + 10));
      }
      
      for (const chunk of chunks) {
        const orQuery = chunk.map(num => `phone.ilike.%${num}%`).join(',');
        const orQuerySecondary = chunk.map(num => `secondary_phone.ilike.%${num}%`).join(',');
        const orQueryContractorPhone = chunk.map(num => `phone.ilike.%${num}%`).join(',');
        const orQueryContractorSecondary = chunk.map(num => `secondary_phone.ilike.%${num}%`).join(',');
        const orQueryContractorOther = chunk.map(num => `other_contact_numbers.ilike.%${num}%`).join(',');

        const results = await Promise.all([
          supabaseAdmin.from('leads').select('id, name, company, phone').or(orQuery),
          supabaseAdmin.from('leads').select('id, name, company, phone:secondary_phone').or(orQuerySecondary),
          supabaseAdmin.from('contractors').select('id, name:contact_name, company:company_name, phone').or(orQueryContractorPhone),
          supabaseAdmin.from('contractors').select('id, name:contact_name, company:company_name, phone:secondary_phone').or(orQueryContractorSecondary),
          supabaseAdmin.from('contractors').select('id, name:contact_name, company:company_name, phone:other_contact_numbers').or(orQueryContractorOther)
        ]);
        
        for (const res of results) {
          if (res.data) {
            matchedEntities = matchedEntities.concat(res.data);
          }
        }
      }
    }

    const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

    repSummaries.forEach(rep => {
      // @ts-ignore
      rep.formattedDuration = formatDuration(rep.totalDuration);
      const avgDuration = rep.totalCalls > 0 ? Math.floor(rep.totalDuration / rep.totalCalls) : 0;
      // @ts-ignore
      rep.formattedAvgDuration = formatDuration(avgDuration);
      rep.logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      rep.logs.forEach(log => {
        if (log.to) {
          const numToMatch = log.to.replace(/[^\d]/g, '').slice(-10);
          const matched = matchedEntities.find(l => l.phone && l.phone.replace(/[^\d]/g, '').includes(numToMatch));
          if (matched) {
            log.leadId = matched.id;
            log.leadName = matched.company || matched.name || 'Unknown Entity';
          }
        }
      });
    });

    const globalAvgDuration = totalGlobalCalls > 0 ? Math.floor(totalGlobalDuration / totalGlobalCalls) : 0;

    return NextResponse.json({
      stats: { 
        totalCalls: totalGlobalCalls, 
        totalDuration: formatDuration(totalGlobalDuration), 
        avgDuration: formatDuration(globalAvgDuration),
        activeUsers: activeUserIds.size,
        balance: `${currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency + ' '}${Math.abs(parseFloat(balance)).toFixed(2)}`
      },
      representatives: repSummaries
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
