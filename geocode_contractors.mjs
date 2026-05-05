import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient('https://pznqrbfgrvfmkdprifst.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0');
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getCsvValue = (csvData, keys) => {
  if (!csvData || typeof csvData !== 'object') return '';
  for (const key of keys) {
    const direct = csvData[key];
    if (direct !== undefined && direct !== null && String(direct).trim()) return Stimport { createClient } from '@supabase/supabase-js'orimport fetch from 'node-fetch';
import dotenv from alimport dotenv from "'dotenv'"