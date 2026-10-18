import { NextResponse } from 'next/server';
import { defaultFromEmail } from '@/lib/resend';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    googleClientIdPrefix: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'missing',
    fromEmail: defaultFromEmail,
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}
