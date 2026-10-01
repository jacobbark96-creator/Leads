import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { notes, leadData } = await req.json();

    if (!notes && !leadData) {
      return NextResponse.json({ error: 'Notes or lead data required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Google Gemini API key not configured. Please add GOOGLE_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    // Build context string from leadData if available
    let contextStr = '';
    if (leadData) {
      const { monthly_spend, timeframe, roof_size, payment_options, property_type, industry } = leadData;
      const contextParts = [];
      if (monthly_spend) contextParts.push(`Monthly Spend: £${monthly_spend}`);
      if (roof_size) contextParts.push(`Roof Size: ${roof_size} SqM`);
      if (timeframe) contextParts.push(`Timeframe: ${timeframe}`);
      if (payment_options) contextParts.push(`Payment Option: ${payment_options}`);
      if (property_type) contextParts.push(`Property Type: ${property_type}`);
      if (industry) contextParts.push(`Industry: ${industry}`);
      
      if (contextParts.length > 0) {
        contextStr = `\nLead Context:\n- ${contextParts.join('\n- ')}\n`;
      }
    }

    const prompt = `You are a professional but conversational solar industry account manager passing a lead to an installer.
Your goal is to rewrite the provided notes to make the lead look attractive, but it MUST sound completely natural and human-written.

Guidelines:
- Write in a conversational, human-to-human tone. Do NOT sound like an AI, a marketing brochure, or an aggressive sales pitch.
- Avoid corporate buzzwords (e.g., avoid "Opportunity for a substantial commercial installation", "Highly motivated", "Actively seeking").
- Simply state the facts in a clear, positive, and casual way. (e.g., "Great commercial project here. The client is spending £1,000 a month and looking to cut down their bills. They have a 115 SqM roof ready to go and want to move forward in the next 1-3 months. They're looking for finance options.")
- Keep it concise (2-4 short, easily readable sentences).
- Remove any internal admin jargon or negative phrasing unless absolutely critical.
${contextStr}
Original Notes:
${notes || '(No original notes provided, please write a natural, human-sounding summary based on the lead context provided above)'}

Return ONLY the rewritten notes text. Do not include any conversational filler, markdown formatting (like bolding), or introductory phrases.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API Error: ${errorText}`);
    }

    const data = await response.json();
    let enhancedNotes = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    enhancedNotes = enhancedNotes.trim().replace(/^["']|["']$/g, '');

    return NextResponse.json({ enhancedNotes });
  } catch (error: any) {
    console.error('Enhance Notes API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to enhance notes' }, { status: 500 });
  }
}
