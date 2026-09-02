import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { numbers } = await req.json();
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Missing numbers array' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const nameMap: Record<string, string> = {};

    // Process all numbers sequentially to avoid rate limits
    for (const num of numbers) {
      const cleanNum = String(num).replace(/[^\d]/g, '').slice(-10);
      if (cleanNum.length < 7) continue;

      const subOrQuery = `phone.ilike.%${cleanNum}%,secondary_phone.ilike.%${cleanNum}%`;
      const subContractorOrQuery = `phone.ilike.%${cleanNum}%,secondary_phone.ilike.%${cleanNum}%,other_contact_numbers.ilike.%${cleanNum}%`;

      const [leadsData, contractorsData] = await Promise.all([
        supabase.from('leads')
          .select('phone, secondary_phone, name, company')
          .or(subOrQuery)
          .limit(1),
        supabase.from('contractors')
          .select('phone, secondary_phone, other_contact_numbers, company_name, contact_name')
          .or(subContractorOrQuery)
          .limit(1)
      ]);

      const isValidName = (name?: string | null) => name && typeof name === 'string' && !name.toLowerCase().includes('unknown');

      let resolvedName = null;

      if (leadsData.data && leadsData.data.length > 0) {
        const item = leadsData.data[0];
        if (isValidName(item.name)) resolvedName = item.name;
        else if (isValidName(item.company)) resolvedName = item.company;
      }

      if (!resolvedName && contractorsData.data && contractorsData.data.length > 0) {
        const item = contractorsData.data[0];
        if (isValidName(item.contact_name)) resolvedName = item.contact_name;
        else if (isValidName(item.company_name)) resolvedName = item.company_name;
      }

      if (resolvedName) {
        nameMap[num] = resolvedName;
      }
    }

    return NextResponse.json({ nameMap });
  } catch (error: any) {
    console.error('Error resolving contacts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
