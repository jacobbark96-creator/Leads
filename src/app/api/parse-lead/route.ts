import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 60; // Allow more time for AI processing if needed

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Google Gemini API key not configured. Please add GOOGLE_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    const prompt = `Extract ALL the following details from this lead write-up, do not leave fields blank if the information exists in the text. Map them to this JSON schema perfectly:
{
  "company": "The business name or company name",
  "name": "The contact person's full name",
  "job_title": "The person's job title or role",
  "email": "The contact email address, if present",
  "phone": "The contact phone number",
  "location": "The confirmed full address",
  "timeframe": "Availability or timeframe (e.g. 10th-12th Feb)",
  "monthly_spend": "The monthly energy spend as a raw number (e.g. '350' not '£350')",
  "property_ownership": "Ownership status (e.g. Owned, Leased)",
  "electrical_supply": "Electrical supply details (e.g. Single, Three phase)",
  "solar_location": "Location of solar array (e.g. Barn roof)",
  "roof_material": "Roof material (e.g. Concrete fibre)",
  "roof_condition": "Roof condition",
  "cover_skylights": false, // Whether skylights can be covered (boolean)
  "ground_mount": false, // Whether ground mount is applicable (boolean)
  "payment_options": "Payment options (e.g. CAPEX, PPA, Finance, Self-pay)",
  "qualification_notes": "Any remaining general notes, directions, or unmapped context"
}

If a value is genuinely not explicitly mentioned or clearly inferable, return an empty string or null. Ensure numbers like spend are just raw numbers. Return ONLY valid JSON, nothing else.

Input text:
${text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API Error: ${errorText}`);
    }

    const result = await response.json();
    const resultText = result.candidates[0].content.parts[0].text;
    const object = JSON.parse(resultText);

    return NextResponse.json({ data: object });
  } catch (error: any) {
    console.error('AI Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse text' }, { status: 500 });
  }
}