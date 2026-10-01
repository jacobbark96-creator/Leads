import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { clientEmail, clientName, confirmedDate } = await req.json();

    if (!clientEmail || !confirmedDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const defaultFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@openlead.co.uk';

    if (!resendApiKey || resendApiKey === 'your_resend_api_key') {
      console.error('Resend API key missing or invalid');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const emailPayload = {
      from: `Openlead Concierge <${defaultFromEmail}>`,
      to: [clientEmail],
      subject: 'Your Site Assessment is Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #2563eb;">Site Assessment Confirmed 🎉</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${clientName || 'there'},
          </p>

          <p style="color: #4b5563; line-height: 1.6;">
            We've successfully booked the site assessment for your purchased lead. 
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e293b;">Booking Details</h3>
            <p style="margin: 5px 0; color: #334155;"><strong>Date & Time:</strong> ${confirmedDate}</p>
          </div>

          <p style="color: #4b5563; line-height: 1.6;">
            You can view this lead in your Client Dashboard. Let us know if you need anything else!
          </p>

          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://openlead.co.uk'}/client-portal" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              View Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} Openlead. All rights reserved.
          </p>
        </div>
      `,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Resend API Error:', data);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error sending concierge notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
