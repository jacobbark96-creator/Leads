import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

async function verifySignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  try {
    const pairs = signatureHeader.split(',').map(pair => pair.split('='));
    const timestamp = pairs.find(([key]) => key === 't')?.[1];
    const signatures = pairs.filter(([key]) => key === 'v1').map(([, value]) => value);

    if (!timestamp || signatures.length === 0) return false;

    // Create the signed payload string
    const signedPayload = `${timestamp}.${payload}`;

    // Compute expected signature using Web Crypto API
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      enc.encode(signedPayload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare provided signatures with the expected one
    return signatures.includes(expectedSignature);
  } catch (error) {
    console.error('Error verifying EXA signature:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const rawPayload = await request.text();
    const signatureHeader = request.headers.get('Exa-Signature') || '';
    const webhookSecret = process.env.EXA_WEBHOOK_SECRET;

    // Verify webhook signature if the secret is configured
    if (webhookSecret) {
      const isValid = await verifySignature(rawPayload, signatureHeader, webhookSecret);
      if (!isValid) {
        console.error('Invalid EXA webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawPayload);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // EXA sends the request details in the payload
    // We'll store the raw payload, extract request_id if available, and set status to received/processed
    const requestId = payload.id || payload.request_id || null;
    const url = payload.url || null;
    const status = payload.status || 'received';

    const { error } = await supabase
      .from('exa_requests')
      .insert([
        {
          request_id: requestId,
          status: status,
          url: url,
          payload: payload,
          updated_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error inserting EXA request:', error);
      return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('EXA Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
