import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { feedback, user_id } = await request.json();

    if (!feedback || !user_id) {
      return NextResponse.json({ error: 'Missing feedback or user_id' }, { status: 400 });
    }

    // Insert into client_feedback
    const { error: feedbackError } = await supabaseAdmin
      .from('client_feedback')
      .insert({
        user_id,
        content: feedback,
      });

    if (feedbackError) throw feedbackError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
