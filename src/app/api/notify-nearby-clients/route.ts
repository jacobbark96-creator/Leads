import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { defaultFromEmail } from '@/lib/resend';

export const runtime = 'edge';

// Calculate distance using Haversine formula (returns miles)
function getDistanceFromLatLonInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export async function POST(req: Request) {
  try {
    const { leadId, location, lat, lng, categoryId, categoryName } = await req.json();

    if (!leadId || !lat || !lng || !categoryId || !categoryName) {
      return NextResponse.json({ error: 'Missing required lead location/category details' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get all active clients who cover this category
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('id, user_id, contact_name, services_offered, service_areas')
      .not('service_areas', 'is', null);

    if (clientsError || !clients) {
      throw new Error(clientsError?.message || 'Failed to fetch clients');
    }

    const nearbyClients = [];

    // 2. Filter clients based on proximity and category
    for (const client of clients) {
      if (!client.services_offered || !client.services_offered.includes(categoryName)) continue;
      
      const areas = client.service_areas || [];
      let isNearby = false;

      for (const area of areas) {
        if (area.radiusMiles === 99999) {
          isNearby = true; // National coverage
          break;
        }
        
        if (area.lat && area.lng && area.radiusMiles) {
          const dist = getDistanceFromLatLonInMiles(lat, lng, area.lat, area.lng);
          if (dist <= area.radiusMiles) {
            isNearby = true;
            break;
          }
        }
      }

      if (isNearby) {
        nearbyClients.push(client);
      }
    }

    if (nearbyClients.length === 0) {
      return NextResponse.json({ success: true, message: 'No nearby clients found' });
    }

    // 3. Get the emails of those clients and check 24h limit
    const resend = new Resend(process.env.RESEND_API_KEY);
    let sentCount = 0;
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    for (const client of nearbyClients) {
      // Check if we sent an email in the last 24h
      const { data: logs } = await supabaseAdmin
        .from('email_logs')
        .select('id')
        .eq('client_id', client.id)
        .eq('email_type', 'nearby_lead_alert')
        .gte('sent_at', twentyFourHoursAgo)
        .limit(1);

      if (logs && logs.length > 0) {
        // Already sent within 24h, skip
        continue;
      }

      // Fetch user email
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', client.user_id)
        .single();

      if (!userData?.email) continue;

      // Send email
      const { error: emailError } = await resend.emails.send({
        from: `Openlead <${defaultFromEmail}>`,
        to: [userData.email],
        subject: `New ${categoryName} Leads Available Soon!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #2563eb;">New Leads Alert! 🚨</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Hi ${client.contact_name || 'Partner'},
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              We wanted to give you a quick heads up! New highly qualified <strong>${categoryName}</strong> leads in your service area (${location || 'your region'}) have just passed our verification checks.
            </p>
            <p style="color: #4b5563; line-height: 1.6; font-weight: bold;">
              These leads will be added to the portal tomorrow at 9:00 AM.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Make sure you have enough credit on your account to purchase the leads you want before they are snatched up!
            </p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Log In to Openlead
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} Openlead. All rights reserved.
            </p>
          </div>
        `
      });

      if (!emailError) {
        sentCount++;
        // Log it
        await supabaseAdmin.from('email_logs').insert({
          client_id: client.id,
          email_type: 'nearby_lead_alert'
        });
      }
    }

    return NextResponse.json({ success: true, message: `Emails sent to ${sentCount} clients` });
  } catch (err: any) {
    console.error('Error notifying nearby clients:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
