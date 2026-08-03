import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { Resend } from 'resend';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get feedback from the last 12 hours (since we run twice a day)
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    const { data: recentFeedback, error: fetchError } = await supabase
      .from('ai_call_feedback')
      .select('call_id, prompt_version, overall_score, issues, what_worked_well')
      .gte('created_at', twelveHoursAgo.toISOString());

    if (fetchError) throw fetchError;
    if (!recentFeedback || recentFeedback.length === 0) {
      return NextResponse.json({ message: 'No feedback found in the last 12 hours.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const summaryPrompt = `You are a Lead AI Engineer analyzing QA feedback for an AI sales agent over the past 12 hours.
    
Here is the raw feedback data:
${JSON.stringify(recentFeedback, null, 2)}

Your task is to identify the 3-5 most common and important patterns in the issues.
For each pattern, provide:
1. A summary of the issue.
2. How many calls it appeared in.
3. One supporting example quote from the agent.
4. A concrete suggested edit to the Ultravox system prompt to fix this behavior.

Format your response as a readable report using HTML (use <h2>, <h3>, <p>, <ul>, and <li> tags). Do not use markdown backticks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: summaryPrompt,
    });

    const reportHtml = response.text || 'No report generated';

    // Save the report
    const { error: insertError } = await supabase.from('ai_feedback_reports').insert({
      report_text: reportHtml,
      prompt_version: recentFeedback[0].prompt_version || 'mixed',
    });

    if (insertError) throw insertError;

    // Send the email via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'ai-reports@yourdomain.com',
        to: process.env.ADMIN_EMAIL || 'you@yourdomain.com', // Add ADMIN_EMAIL to your .env
        subject: 'Twice-Daily AI Agent QA Report',
        html: `
          <h1>AI Agent Performance Report</h1>
          <p>Here is the QA summary from the last 12 hours of calls:</p>
          <hr/>
          ${reportHtml}
        `
      });
    } else {
      console.warn("RESEND_API_KEY not found. Skipping email.");
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Summary generated and emailed successfully',
      report: reportHtml
    });
  } catch (error: any) {
    console.error('Error in summary-report cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}