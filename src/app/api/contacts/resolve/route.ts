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
    const numbersToProcess = numbers.filter(n => {
      const clean = String(n).replace(/[^\d]/g, '').slice(-10);
      return clean.length >= 7;
    });

    if (numbersToProcess.length === 0) {
      return NextResponse.json({ nameMap });
    }

    // Chunk numbers to process in batches
    const chunks: string[][] = [];
    const last10Digits = numbersToProcess.map(n => String(n).replace(/[^\d]/g, '').slice(-10));
    
    for (let i = 0; i < last10Digits.length; i += 20) {
      chunks.push(last10Digits.slice(i, i + 20));
    }

    let matchedEntities: any[] = [];
    const chunkPromises = chunks.flatMap(chunk => {
      const leadOrQuery = chunk.map(num => `phone.ilike.%${num}%,secondary_phone.ilike.%${num}%`).join(',');
      const contractorOrQuery = chunk.map(num => `phone.ilike.%${num}%,secondary_phone.ilike.%${num}%,other_contact_numbers.ilike.%${num}%`).join(',');

      return [
        supabase.from('leads').select('name, company, phone, secondary_phone').or(leadOrQuery),
        supabase.from('contractors').select('contact_name, company_name, phone, secondary_phone, other_contact_numbers').or(contractorOrQuery)
      ];
    });

    // Execute in batches of 10
    for (let i = 0; i < chunkPromises.length; i += 10) {
      const batch = chunkPromises.slice(i, i + 10);
      const results = await Promise.all(batch);
      for (const res of results) {
        if (res.data) {
          matchedEntities = matchedEntities.concat(res.data);
        }
      }
    }

    const isValidName = (name?: string | null) => name && typeof name === 'string' && !name.toLowerCase().includes('unknown');

    // Map results back to original numbers
    for (const originalNum of numbersToProcess) {
      const cleanNum = String(originalNum).replace(/[^\d]/g, '').slice(-10);
      
      const matched = matchedEntities.find(l => {
        const p1 = l.phone ? l.phone.replace(/[^\d]/g, '') : '';
        const p2 = l.secondary_phone ? l.secondary_phone.replace(/[^\d]/g, '') : '';
        const p3 = l.other_contact_numbers ? l.other_contact_numbers.replace(/[^\d]/g, '') : '';
        return p1.includes(cleanNum) || p2.includes(cleanNum) || p3.includes(cleanNum);
      });

      if (matched) {
        let name = null;
        if ('name' in matched) {
          name = isValidName(matched.name) ? matched.name : matched.company;
        } else {
          name = isValidName(matched.contact_name) ? matched.contact_name : matched.company_name;
        }
        
        if (isValidName(name)) {
          nameMap[originalNum] = name;
        }
      }
    }

    return NextResponse.json({ nameMap });
  } catch (error: any) {
    console.error('Error resolving contacts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
