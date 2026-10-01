import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { query, numResults = 10, useAutoprompt = true } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const exaApiKey = process.env.EXA_API_KEY;
    
    if (!exaApiKey) {
      return NextResponse.json({ error: 'EXA_API_KEY environment variable is not set' }, { status: 500 });
    }

    // 1. Create a pending request in the database
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const { data: dbRecord, error: insertError } = await supabase
      .from('exa_requests')
      .insert([
        {
          request_id: requestId,
          status: 'processing',
          url: 'api.exa.ai/search',
          payload: { query, numResults, useAutoprompt },
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting EXA request:', insertError);
      return NextResponse.json({ error: 'Failed to log request to database' }, { status: 500 });
    }

    // 2. Call the EXA API
    try {
      const exaResponse = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': exaApiKey
        },
        body: JSON.stringify({
          query,
          useAutoprompt,
          numResults
        })
      });

      const responseData = await exaResponse.json();

      if (!exaResponse.ok) {
        throw new Error(responseData.error || 'Failed to fetch from EXA API');
      }

      // 3. Update the database with the success result
      await supabase
        .from('exa_requests')
        .update({
          status: 'completed',
          response_data: responseData,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbRecord.id);

      return NextResponse.json({ success: true, data: responseData }, { status: 200 });

    } catch (apiError: any) {
      // 4. Update the database with the error
      await supabase
        .from('exa_requests')
        .update({
          status: 'failed',
          response_data: { error: apiError.message },
          updated_at: new Date().toISOString()
        })
        .eq('id', dbRecord.id);

      throw apiError;
    }

  } catch (error: any) {
    console.error('EXA Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
