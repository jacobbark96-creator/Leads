import { NextResponse } from 'next/server';

export const runtime = 'edge';

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@openlead.co.uk';

export async function POST(req: Request) {
  try {
    const { name, email, phone, cover_letter, resume_url, job_title } = await req.json();

    if (!name || !email || !resume_url || !job_title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0ea5e9;">New Job Application</h2>
        <p><strong>Job Title:</strong> ${job_title}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        
        <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
          <h3 style="margin-top: 0; font-size: 16px; color: #0f172a;">Cover Letter</h3>
          <p style="white-space: pre-wrap; font-size: 14px;">${cover_letter || 'No cover letter provided.'}</p>
        </div>
        
        <p style="margin-top: 20px;">
          <a href="${resume_url}" style="background-color: #0ea5e9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Resume / CV</a>
        </p>
      </div>
    `;

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Resend API key missing' }, { status: 500 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: \`Openlead Careers <\${defaultFromEmail}>\`,
        to: ['careers@openlead.co.uk'],
        subject: \`New Application: \${job_title} - \${name}\`,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error || 'Failed to send notification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error /api/careers/notify:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
