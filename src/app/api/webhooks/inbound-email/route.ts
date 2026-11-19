import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function extractEmails(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
  return matches ? matches.map(e => e.toLowerCase()) : [];
}

export async function POST(req: Request) {
  try {
    let from = '';
    let to = '';
    let cc = '';
    let subject = '';
    let text = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      
      // Resend Format
      if (body.type === 'email.received' && body.data) {
        from = body.data.from || '';
        to = (body.data.to || []).join(', ');
        cc = (body.data.cc || []).join(', ');
        subject = body.data.subject || '';
        text = body.data.text || '';
      } 
      // Postmark Format
      else if (body.From && body.To) {
        from = body.From;
        to = body.To;
        cc = body.Cc || '';
        subject = body.Subject || '';
        text = body.TextBody || '';
      }
      // Generic / Zapier JSON
      else {
        from = body.from || body.sender || '';
        to = body.to || body.recipient || '';
        cc = body.cc || body.bcc || '';
        subject = body.subject || '';
        text = body.text || body.textBody || body.body_plain || body.body || '';
      }
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Sendgrid / Mailgun Format
      const formData = await req.formData();
      from = (formData.get('from') as string) || (formData.get('sender') as string) || '';
      to = (formData.get('to') as string) || (formData.get('recipient') as string) || '';
      cc = (formData.get('cc') as string) || '';
      subject = (formData.get('subject') as string) || '';
      text = (formData.get('text') as string) || (formData.get('body-plain') as string) || '';
    }

    if (!from) {
      return NextResponse.json({ error: 'Missing from address' }, { status: 400 });
    }

    // Extract raw email addresses
    const fromEmails = extractEmails(from);
    const toEmails = extractEmails(to + ',' + cc);
    
    if (fromEmails.length === 0) {
      return NextResponse.json({ error: 'Could not parse from email' }, { status: 400 });
    }

    const senderEmail = fromEmails[0];
    
    // We want to find a lead that matches ANY of the 'to' or 'cc' or 'from' emails.
    const allInvolvedEmails = [...new Set([...fromEmails, ...toEmails])];

    // Find the rep/user in the system (the one who sent or received it)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('email', allInvolvedEmails)
      .maybeSingle();

    // Find the lead in the system
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('id, name, company, email')
      .in('email', allInvolvedEmails);

    if (leadsError) {
      console.error('Error finding leads:', leadsError);
    }

    if (!leads || leads.length === 0) {
      console.log('No matching lead found for emails:', allInvolvedEmails);
      return NextResponse.json({ success: true, message: 'No matching lead found, ignored.' });
    }

    const lead = leads[0]; 
    
    // Determine the note author
    let authorName = 'Email Sync';
    let authorId = null;

    if (user && senderEmail === user.email) {
      authorName = user.name;
      authorId = user.id;
    } else if (senderEmail === lead.email) {
      authorName = lead.name || lead.company || senderEmail;
    } else {
      authorName = senderEmail;
    }

    let content = `📧 **Email:** ${subject || 'No Subject'}\n**From:** ${from}\n**To:** ${to}\n\n`;
    
    // Clean up the text body
    let cleanText = text.trim();
    if (cleanText.length > 3000) {
      cleanText = cleanText.substring(0, 3000) + '\n...[truncated]';
    }
    
    content += cleanText;

    const { error: insertError } = await supabaseAdmin.from('lead_notes').insert({
      lead_id: lead.id,
      user_id: authorId,
      author_name: authorName,
      content: content,
      internal_only: false
    });

    if (insertError) {
      console.error('Error inserting email note:', insertError);
      return NextResponse.json({ error: 'Failed to insert note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email attached to lead successfully' });
  } catch (error: any) {
    console.error('Inbound email webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
