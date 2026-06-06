import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/email-confirmed';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Exchange the code for a session (this confirms the email in PKCE flow)
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect the user to the destination page
  return NextResponse.redirect(new URL(next, request.url));
}
