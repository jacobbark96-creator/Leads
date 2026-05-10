import { NextRequest, NextResponse } from 'next/server';
import { geocodingQueue, companyLookupQueue } from '../../../../server/enrichment/queues';

export async function POST(request: NextRequest) {
  try {
    const { lead_id, company_name, address } = await request.json();

    if (!lead_id || !company_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Trigger enrichment queues for this single lead
    await geocodingQueue.add('geocode_and_image', {
      lead_id,
      address: address || null,
      company_name
    });

    await companyLookupQueue.add('lookup_company', {
      lead_id,
      company_name
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Trigger enrichment error:', error);
    return NextResponse.json({ error: 'Failed to trigger enrichment' }, { status: 500 });
  }
}
