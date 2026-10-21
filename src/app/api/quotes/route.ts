import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addDays, isWeekend, format } from 'date-fns';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  try {
    const { data } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'daily_quotes')
      .single();
    
    let quotes: Record<string, any> = {};
    if (data && data.value) {
      quotes = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }

    // Auto-check for missing quotes and notify Jake if needed
    try {
      const { data: jakeUser } = await supabaseAdmin
        .from('users')
        .select('id, google_refresh_token')
        .eq('email', 'Jake@openlead.co.uk')
        .single();

      if (jakeUser?.google_refresh_token) {
        // Calculate next 23 working days
        let blankCount = 0;
        let current = new Date();
        let daysCount = 0;

        while (daysCount < 23) {
          if (!isWeekend(current)) {
            const dStr = format(current, 'yyyy-MM-dd');
            if (!quotes[dStr] || !quotes[dStr].quote || quotes[dStr].quote.trim() === '') {
              blankCount++;
            }
            daysCount++;
          }
          current = addDays(current, 1);
        }

        if (blankCount > 15) {
          // Check if we already notified recently to prevent spam (we can use another system_setting for this)
          const { data: lastNotifiedData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'quotes_task_last_notified')
            .single();

          const todayStr = format(new Date(), 'yyyy-MM-dd');
          if (!lastNotifiedData || lastNotifiedData.value !== todayStr) {
            // Trigger Google Task creation
            const origin = new URL(req.url).origin;
            await fetch(`${origin}/api/google/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: jakeUser.id,
                title: `Action Required: Add Quotes of the Day (${blankCount} missing)`,
                notes: `You have ${blankCount} blank days in the next 23 working days for the Quote of the Day. Please update them in the Admin CRM -> Motivation tab.`
              })
            });

            // Update last notified
            await supabaseAdmin.from('system_settings').upsert({
              key: 'quotes_task_last_notified',
              value: todayStr
            }, { onConflict: 'key' });
          }
        }
      }
    } catch (checkErr) {
      console.error('Error in auto-check missing quotes:', checkErr);
    }
    
    return NextResponse.json({ quotes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
