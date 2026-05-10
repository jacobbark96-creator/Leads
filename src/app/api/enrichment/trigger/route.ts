import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { lead_id, company_name, address } = await request.json();

    if (!lead_id || !company_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Since BullMQ requires Redis (which relies on native Node modules like 'net' and 'crypto'),
    // we cannot initialize it inside the Edge runtime directly.
    // Instead of queueing here, the UI could ideally call a dedicated Node.js microservice.
    // For now, we will safely bypass this so the UI doesn't crash on Cloudflare.
    console.log(`[Edge API] Received trigger for ${lead_id}. Note: Queuing disabled on Edge runtime.`);

    return NextResponse.json({ success: true, message: 'Trigger received (queuing bypassed on edge)' });
  } catch (error: any) {
    console.error('Trigger enrichment error:', error);
    return NextResponse.json({ error: 'Failed to trigger enrichment' }, { status: 500 });
  }
}
