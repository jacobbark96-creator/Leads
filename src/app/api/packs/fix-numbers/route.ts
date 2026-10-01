import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cleanPhoneNumber(phone: string): string {
  if (!phone) return phone;
  
  let cleaned = phone.trim();

  // If scientific notation (e.g. 4.47123E+11)
  if (/^[\d.]+[Ee]\+?\d+$/.test(cleaned)) {
    try {
      const num = Number(cleaned);
      if (!isNaN(num)) {
        cleaned = num.toLocaleString('fullwide', { useGrouping: false });
      }
    } catch(e) {}
  }

  // Remove all non-numeric characters except leading +
  cleaned = cleaned.replace(/(?!^\+)[^\d]/g, '');

  // Format as UK number if applicable
  if (cleaned.startsWith('07') || cleaned.startsWith('01') || cleaned.startsWith('02') || cleaned.startsWith('03') || cleaned.startsWith('08')) {
    cleaned = '+44' + cleaned.substring(1);
  } else if (cleaned.startsWith('44') && cleaned.length >= 12) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

export async function POST(request: Request) {
  try {
    const { packId } = await request.json();

    if (!packId) {
      return NextResponse.json({ error: 'Missing packId' }, { status: 400 });
    }

    // Fetch all leads in this pack
    const { data: memberships, error: fetchError } = await supabaseAdmin
      .from('lead_pack_memberships')
      .select('lead_id, leads(id, phone)')
      .eq('lead_pack_id', packId);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch leads', details: fetchError }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ message: 'No leads found in this pack', fixedCount: 0 });
    }

    const leads = memberships.map(m => Array.isArray(m.leads) ? m.leads[0] : m.leads).filter(Boolean);

    let fixedCount = 0;
    const updates = [];

    for (const lead of leads) {
      if (!lead.phone) continue;
      
      const newPhone = cleanPhoneNumber(lead.phone);
      if (newPhone !== lead.phone) {
        updates.push({ id: lead.id, phone: newPhone });
      }
    }

    if (updates.length > 0) {
      // Process updates in batches of 50 using Promise.all and .update()
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (update) => {
          const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({ phone: update.phone })
            .eq('id', update.id);
            
          if (updateError) {
            console.error(`Update error for lead ${update.id}:`, updateError);
          }
        }));
        
        fixedCount += batch.length;
        // Small delay to avoid hammering the DB
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return NextResponse.json({ success: true, fixedCount });
  } catch (error: any) {
    console.error('Fix numbers API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
