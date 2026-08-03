import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Simple auth check for cron jobs to prevent unauthorized triggering
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Find unreviewed calls
    const { data: callsToReview, error: fetchError } = await supabase
      .from('ai_calls')
      .select('*')
      .eq('reviewed', false)
      .limit(10); // Batch limit to avoid timeouts

    if (fetchError) throw fetchError;
    if (!callsToReview || callsToReview.length === 0) {
      return NextResponse.json({ message: 'No unreviewed calls found.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let processedCount = 0;
    let failedCount = 0;

    for (const call of callsToReview) {
      try {
        let audioPart = null;

        // If we have a recording URL, we can fetch it and pass it to Gemini
        if (call.recording_url) {
          try {
            // Note: If the audio file is very large, this fetch might take time.
            const audioRes = await fetch(call.recording_url);
            if (audioRes.ok) {
              const arrayBuffer = await audioRes.arrayBuffer();
              const base64Audio = Buffer.from(arrayBuffer).toString('base64');
              audioPart = {
                inlineData: {
                  data: base64Audio,
                  mimeType: 'audio/wav', // Twilio typically uses audio/x-wav or audio/wav
                }
              };
            }
          } catch (audioErr) {
            console.warn('Could not fetch audio for call:', call.call_id, audioErr);
          }
        }

        const prompt = `You are an expert QA scorer for a sales AI agent. Review the following call transcript (and listen to the audio if provided) and grade it based on the rubric below.

RUBRIC:
1. Did the agent ask all required qualification questions?
2. Did the agent handle objections (price/timing/not interested) well?
3. Did the agent talk over or ignore the lead?
4. Did the call end with a clear next step?
5. TONALITY & DELIVERY: Did the agent sound robotic, overly enthusiastic, or unnatural? Did it use natural conversational pacing?

TRANSCRIPT:
${call.transcript}

LEAD OUTCOME: ${call.lead_outcome || 'Unknown'}`;

        const contents: any[] = [{ text: prompt }];
        if (audioPart) {
          contents.push(audioPart);
        }

        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overall_score: { type: Type.INTEGER, description: "Score from 1 to 5" },
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      severity: { type: Type.STRING, description: "high, medium, or low" },
                      detail: { type: Type.STRING },
                      quote: { type: Type.STRING }
                    }
                  }
                },
                what_worked_well: { type: Type.STRING }
              }
            }
          }
        });

        let responseText = response.text || "{}";
        const parsedFeedback = JSON.parse(responseText);

        // Save feedback
        const { error: insertError } = await supabase.from('ai_call_feedback').insert({
          call_id: call.call_id,
          prompt_version: call.prompt_version,
          overall_score: parsedFeedback.overall_score,
          issues: parsedFeedback.issues,
          what_worked_well: parsedFeedback.what_worked_well,
        });

        if (insertError) throw insertError;

        // Mark as reviewed
        const { error: updateError } = await supabase
          .from('ai_calls')
          .update({ reviewed: true })
          .eq('id', call.id);

        if (updateError) throw updateError;

        processedCount++;
      } catch (err) {
        console.error(`Failed to grade call ${call.call_id}:`, err);
        failedCount++;
        // Don't crash, continue to next call
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount, 
      failed: failedCount 
    });
  } catch (error: any) {
    console.error('Error in grade-calls cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}