import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;
const CH_BASE_URL = 'https://api.company-information.service.gov.uk';

// Helper to normalize company names for better matching
export function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|llp|group|inc|corp)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to check DB cache before hitting the API
async function getCachedResponse(cacheKey: string) {
  const { data } = await supabase
    .from('enrichment_cache')
    .select('response')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  return data ? data.response : null;
}

// Helper to save API response to DB cache
async function setCachedResponse(cacheKey: string, source: string, response: any, ttlDays: number = 30) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  
  await supabase
    .from('enrichment_cache')
    .upsert({
      cache_key: cacheKey,
      source,
      response,
      expires_at: expiresAt.toISOString()
    }, { onConflict: 'cache_key' });
}

export async function searchCompany(companyName: string) {
  if (!CH_API_KEY) throw new Error('COMPANIES_HOUSE_API_KEY is not configured');

  const normalized = normalizeCompanyName(companyName);
  if (!normalized) return null;

  const cacheKey = `ch_search_${normalized.replace(/\s+/g, '_')}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    console.log(`[CH Service] Cache hit for search: ${companyName}`);
    return cached;
  }

  console.log(`[CH Service] Fetching search for: ${companyName}`);
  const response = await axios.get(`${CH_BASE_URL}/search/companies`, {
    params: { q: normalized, items_per_page: 3 },
    auth: { username: CH_API_KEY, password: '' }
  });

  const bestMatch = response.data.items && response.data.items.length > 0 ? response.data.items[0] : null;
  
  if (bestMatch) {
    await setCachedResponse(cacheKey, 'companies_house', bestMatch, 30); // Cache search for 30 days
  }
  
  return bestMatch;
}

export async function getCompanyProfile(companyNumber: string) {
  if (!CH_API_KEY) throw new Error('COMPANIES_HOUSE_API_KEY is not configured');

  const cacheKey = `ch_profile_${companyNumber}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  const response = await axios.get(`${CH_BASE_URL}/company/${companyNumber}`, {
    auth: { username: CH_API_KEY, password: '' }
  });

  await setCachedResponse(cacheKey, 'companies_house', response.data, 30);
  return response.data;
}

export async function getCompanyOfficers(companyNumber: string) {
  if (!CH_API_KEY) throw new Error('COMPANIES_HOUSE_API_KEY is not configured');

  const cacheKey = `ch_officers_${companyNumber}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  const response = await axios.get(`${CH_BASE_URL}/company/${companyNumber}/officers`, {
    params: { items_per_page: 50 }, // Get up to 50 officers
    auth: { username: CH_API_KEY, password: '' }
  });

  // Filter out resigned officers to save space and focus on active directors
  const activeOfficers = response.data.items?.filter((o: any) => !o.resigned_on) || [];
  
  await setCachedResponse(cacheKey, 'companies_house', activeOfficers, 30);
  return activeOfficers;
}
