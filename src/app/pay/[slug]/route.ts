import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: link, error } = await supabaseAdmin
      .from('magic_checkout_links')
      .select('token, expires_at, used_at, action_link')
      .eq('slug', slug)
      .single();

    if (error || !link) {
      return new NextResponse('Link not found', { status: 404 });
    }

    if (link.used_at) {
      return new NextResponse('This link has already been used', { status: 400 });
    }

    if (new Date(link.expires_at) < new Date()) {
      return new NextResponse('This link has expired', { status: 400 });
    }

    const host = req.headers.get('host');
    const isLocal = host?.includes('localhost') || host?.includes('127.0.0.1');
    const protocol = req.headers.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
    const appUrl = `${protocol}://${host}`;

    // Redirect directly to our checkout page with the token.
    return NextResponse.redirect(`${appUrl}/magic-checkout?token=${link.token}`);
  } catch (err: any) {
    console.error('Error in /pay/[slug] redirect:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
