import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  // Simple basic auth or cron secret check to prevent unauthorized scraping
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && req.headers.get('x-api-key') !== cronSecret) {
    // Return 401 if a secret is configured and not provided (can test freely in dev if CRON_SECRET is not set)
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const baseUrl = 'https://www.find-government-grants.service.gov.uk';
  let currentPage = 1;
  let hasNextPage = true;
  let totalProcessed = 0;
  
  const scrapedUrls = new Set<string>();

  try {
    console.log('Starting government grants scraper...');

    while (hasNextPage && currentPage <= 20) { // Safety limit of 20 pages (500 grants)
      const pageUrl = `${baseUrl}/grants?page=${currentPage}`;
      console.log(`Scraping page ${currentPage}...`);
      
      const response = await fetch(pageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch page ${currentPage}: ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);

      const grantsOnPage = [];

      $('h2 a').each((i, linkEl) => {
        const parentContainer = $(linkEl).closest('li');
        if (!parentContainer.length) return;
        
        const title = $(linkEl).text().trim();
        const relativeLink = $(linkEl).attr('href');
        if (!title || !relativeLink) return;

        const url = relativeLink.startsWith('http') ? relativeLink : `${baseUrl}${relativeLink}`;
        
        const details: Record<string, string> = {};
        parentContainer.find('dl dt').each((j, dt) => {
          const key = $(dt).text().trim();
          const value = $(dt).next('dd').text().trim();
          details[key] = value;
        });

        grantsOnPage.push({
          title,
          url,
          location: details['Location'] || null,
          who_can_apply: details['Who can apply'] || null,
          amount: details['How much you can get'] || null,
          opening_date: details['Opening date'] || null,
          closing_date: details['Closing date'] || null,
        });
      });

      if (grantsOnPage.length === 0) {
        hasNextPage = false;
        break;
      }

      // Upsert to Supabase
      for (const grant of grantsOnPage) {
        scrapedUrls.add(grant.url);
        await supabaseAdmin
          .from('government_grants')
          .upsert({
            title: grant.title,
            url: grant.url,
            location: grant.location,
            who_can_apply: grant.who_can_apply,
            amount: grant.amount,
            opening_date: grant.opening_date,
            closing_date: grant.closing_date,
            updated_at: new Date().toISOString()
          }, { onConflict: 'url' });
      }

      totalProcessed += grantsOnPage.length;

      // Check if there is a "Next page" link
      const nextLink = $('a:contains("Next")').length > 0 || $('.govuk-pagination__next a').length > 0;
      if (nextLink) {
        currentPage++;
        // Polite delay
        await new Promise(r => setTimeout(r, 500));
      } else {
        hasNextPage = false;
      }
    }

    // Optional: Delete old grants that weren't found in this scrape (meaning they were removed from the site)
    // We can do this by deleting grants where updated_at is older than 1 day
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabaseAdmin
      .from('government_grants')
      .delete()
      .lt('updated_at', yesterday);

    if (deleteError) {
      console.error('Failed to clean up old grants:', deleteError);
    }

    console.log(`Scraper finished. Total grants processed: ${totalProcessed}`);
    return NextResponse.json({ success: true, count: totalProcessed });

  } catch (error: any) {
    console.error('Scraper error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
