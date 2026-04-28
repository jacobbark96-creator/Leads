import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const maxDuration = 60; // Allow more time for AI processing if needed

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ 
        error: 'Google Gemini API key not configured. Please add GOOGLE_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      system: 'You are a highly accurate CRM data extraction assistant. Your job is to extract lead information from pasted write-ups and map them perfectly to our database schema. Read the text very carefully and extract EVERY detail requested. If a value is genuinely not explicitly mentioned or clearly inferable, return an empty string or null. Ensure numbers like spend are just raw numbers.',
      prompt: `Extract ALL the following details from this lead write-up, do not leave fields blank if the information exists in the text:\n\n${text}`,
      schema: z.object({
        company: z.string().default("").describe("The business name or company name"),
        name: z.string().default("").describe("The contact person's full name"),
        job_title: z.string().default("").describe("The person's job title or role"),
        email: z.string().default("").describe("The contact email address, if present"),
        phone: z.string().default("").describe("The contact phone number"),
        location: z.string().default("").describe("The confirmed full address"),
        timeframe: z.string().default("").describe("Availability or timeframe (e.g. 10th-12th Feb)"),
        monthly_spend: z.string().default("").describe("The monthly energy spend as a raw number (e.g. '350' not '£350')"),
        property_ownership: z.string().default("").describe("Ownership status (e.g. Owned, Leased)"),
        electrical_supply: z.string().default("").describe("Electrical supply details (e.g. Single, Three phase)"),
        solar_location: z.string().default("").describe("Location of solar array (e.g. Barn roof)"),
        roof_material: z.string().default("").describe("Roof material (e.g. Concrete fibre)"),
        roof_condition: z.string().default("").describe("Roof condition"),
        cover_skylights: z.boolean().default(false).describe("Whether skylights can be covered (true/false)"),
        ground_mount: z.boolean().default(false).describe("Whether ground mount is applicable (true/false)"),
        payment_options: z.string().default("").describe("Payment options (e.g. CAPEX, PPA, Finance, Self-pay)"),
        qualification_notes: z.string().default("").describe("Any remaining general notes, directions, or unmapped context")
      }),
    });

    return NextResponse.json({ data: object });
  } catch (error: any) {
    console.error('AI Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse text' }, { status: 500 });
  }
}