import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: magicLink, error } = await supabaseAdmin
      .from('magic_checkout_links')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !magicLink) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    if (magicLink.used_at) return NextResponse.json({ error: 'This checkout link has already been used' }, { status: 400 });
    if (new Date(magicLink.expires_at) < new Date()) return NextResponse.json({ error: 'This checkout link has expired' }, { status: 400 });

    await supabaseAdmin.from('magic_checkout_links').update({ used_at: new Date().toISOString() }).eq('id', magicLink.id);

    return NextResponse.json({ url: magicLink.stripe_url });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
