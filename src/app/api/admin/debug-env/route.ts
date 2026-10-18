import { NextResponse } from 'next/server';
import { defaultFromEmail } from '@/lib/resend';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 7) + '...' : 'missing',
    fromEmail: defaultFromEmail,
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}
