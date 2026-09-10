import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid userIds array' }, { status: 400 });
    }

    const statuses: Record<string, boolean> = {};

    // Process in smaller batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (userId) => {
        try {
          const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (error || !user) {
            statuses[userId] = false;
            return;
          }

          const trialPassword = user.user_metadata?.trial_password;
          if (!trialPassword) {
            statuses[userId] = false;
            return;
          }

          // Test the password by attempting to sign in
          // We create a fresh client so we don't mess with the admin session
          const tempClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
          const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({
            email: user.email!,
            password: trialPassword
          });

          if (signInError || !signInData.user) {
            statuses[userId] = false;
          } else {
            statuses[userId] = true;
          }
        } catch (e) {
          statuses[userId] = false;
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < userIds.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return NextResponse.json({ statuses });

  } catch (err: any) {
    console.error('Check Status API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
