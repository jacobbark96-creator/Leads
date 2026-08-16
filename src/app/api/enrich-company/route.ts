import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { companyName, location, leadId } = await req.json();

    if (!companyName) {
      return NextResponse.json({ error: 'Company name required' }, { status: 400 });
    }

    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Companies House API key not configured. Please add COMPANIES_HOUSE_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;

    // 1. Search for company
    const searchUrl = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(companyName)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': authHeader }
    });

    if (!searchRes.ok) {
      throw new Error(`Failed to search Companies House: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No matching company found on Companies House.' }, { status: 404 });
    }

    // Find best match: Exact name match OR slightly different name but matching location
    function cleanString(str: string) {
      return (str || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    function removeCommonWords(str: string) {
      const common = ['ltd', 'limited', 'plc', 'llp', 'co', 'company', 'uk', 'group'];
      return str.split(' ').filter(w => !common.includes(w)).join(' ');
    }

    const leadNameClean = removeCommonWords(cleanString(companyName));
    const leadLocationClean = cleanString(location || '');

    let bestMatch = null;
    let highestScore = 0;

    for (const item of items) {
      const itemTitleClean = removeCommonWords(cleanString(item.title));
      const itemAddressClean = cleanString(item.address_snippet || '');

      let score = 0;
      
      if (itemTitleClean === leadNameClean && leadNameClean.length > 0) {
        score += 100;
      } else {
        const leadWords = leadNameClean.split(' ').filter(w => w.length > 1);
        const itemWords = itemTitleClean.split(' ').filter(w => w.length > 1);
        let matches = 0;
        for (const w of leadWords) {
          if (itemWords.includes(w)) matches++;
        }
        
        if (leadWords.length > 0 && matches === leadWords.length) {
          score += 80;
        } else if (leadWords.length > 0 && matches / leadWords.length >= 0.5) {
          score += 40;
        }
      }

      if (leadLocationClean && itemAddressClean) {
        const locWords = leadLocationClean.split(' ').filter(w => w.length > 2);
        const addressWords = itemAddressClean.split(' ');
        let locMatches = 0;
        for (const w of locWords) {
          if (addressWords.includes(w)) locMatches++;
        }
        if (locWords.length > 0 && locMatches > 0) {
          score += 30;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    // Require a minimum score to accept the match (e.g., 40 points means at least half the words matched)
    if (!bestMatch || highestScore < 40) {
      return NextResponse.json({ error: 'No sufficiently close match found on Companies House.' }, { status: 404 });
    }

    const companyNumber = bestMatch.company_number;

    // 2. Get Company Profile
    const profileRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}`, {
      headers: { 'Authorization': authHeader }
    });
    
    if (!profileRes.ok) {
      throw new Error(`Failed to fetch company profile: ${profileRes.status}`);
    }
    const profile = await profileRes.json();

    // 3. Get Charges
    const chargesRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}/charges`, {
      headers: { 'Authorization': authHeader }
    });
    const charges = chargesRes.ok ? await chargesRes.json() : { total_count: 0, unpaid_count: 0 };

    // 4. Get Officers
    const officersRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}/officers`, {
      headers: { 'Authorization': authHeader }
    });
    const officers = officersRes.ok ? await officersRes.json() : { items: [] };

    // Aggregate Data
    const isActive = profile.company_status === 'active';
    let yearsTrading = 0;
    if (profile.date_of_creation) {
      yearsTrading = Math.floor((Date.now() - new Date(profile.date_of_creation).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    }

    const activeDirectors = (officers.items || []).filter((o: any) => o.officer_role === 'director' && !o.resigned_on).length;
    
    // Calculate Score
    let riskScore = 0;
    if (!isActive) riskScore += 100;
    if (profile.has_insolvency_history) riskScore += 50;
    if (yearsTrading < 1) riskScore += 30;
    else if (yearsTrading < 2) riskScore += 15;
    if (charges.unpaid_count > 0 || (charges.total_count > 0 && charges.total_count !== charges.satisfied_count)) riskScore += 15;

    let financeScoreLabel = '';
    let financeGrade = '';
    if (riskScore >= 50) {
      financeScoreLabel = 'High Risk (CAPEX Only)';
      financeGrade = 'D';
    } else if (riskScore >= 30) {
      financeScoreLabel = 'Medium Risk (Finance Unlikely)';
      financeGrade = 'C';
    } else if (riskScore >= 15) {
      financeScoreLabel = 'Moderate Risk (Finance Possible)';
      financeGrade = 'B';
    } else {
      financeScoreLabel = 'Low Risk (Finance Likely)';
      financeGrade = 'A';
    }

    const enrichmentData = {
      active_company: isActive ? 'Yes' : 'No',
      years_trading: yearsTrading,
      positive_net_assets: profile.has_insolvency_history ? 'No' : (yearsTrading >= 2 ? 'Likely Yes' : 'Unknown'),
      latest_accounts_filed: profile.accounts?.last_accounts?.made_up_to || 'None filed',
      insolvency_indicators: profile.has_insolvency_history ? 'Yes (Check CH)' : 'None detected',
      charges: charges.total_count > 0 ? `${charges.total_count} total (${charges.total_count - (charges.satisfied_count || 0)} outstanding)` : 'None',
      number_of_directors: activeDirectors,
      finance_score_label: financeScoreLabel,
      finance_grade: financeGrade,
      company_number: companyNumber,
      company_name: profile.company_name
    };

    // Optionally update supabase lead directly
    if (leadId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch current lead to append to csv_data
        const { data: leadData } = await supabase.from('leads').select('csv_data').eq('id', leadId).single();
        const currentCsvData = leadData?.csv_data || {};
        
        await supabase.from('leads').update({
          csv_data: { ...currentCsvData, ch_enrichment: enrichmentData }
        }).eq('id', leadId);
      }
    }

    return NextResponse.json({ enrichmentData });
  } catch (error: any) {
    console.error('Enrich Company API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to enrich company data' }, { status: 500 });
  }
}
