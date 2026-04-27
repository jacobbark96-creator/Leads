const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pznqrbfgrvfmkdprifst.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnFyYmZncnZmbWtkcHJpZnN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NDE0MywiZXhwIjoyMDkyMzQwMTQzfQ.okirNkFN20GeLmTaSpKymcr-VAZhvpmlGRubGUkllO0'
);

async function run() {
  const leadData = {
    location: 'Camps Industrial Estate, Camps Rd, Kirknewton EH27 8DF, UK',
    property_ownership: 'Owned'
  };

  const [grantsRes, exclusionsRes] = await Promise.all([
    supabase.from('government_grants').select('id, title, url, amount, closing_date, location, who_can_apply'),
    supabase.from('grant_exclusions').select('keyword')
  ]);
  
  const grantsData = grantsRes.data;
  const exclusionsData = exclusionsRes.data || [];
  const exclusionKeywords = exclusionsData.map(e => e.keyword.toLowerCase().trim()).filter(Boolean);

  if (grantsData) {
    const matched = grantsData.filter(g => {
      const locText = (g.location || '').toLowerCase();
      const whoText = (g.who_can_apply || '').toLowerCase();
      const titleText = (g.title || '').toLowerCase();
      
      if (exclusionKeywords.length > 0 && exclusionKeywords.some(kw => titleText.includes(kw) || locText.includes(kw) || whoText.includes(kw))) {
        return false;
      }
      
      let locMatch = false;
      const leadLoc = (leadData.location || '').toLowerCase();
      
      if (!locText || locText.includes('national') || locText.includes('uk')) {
        locMatch = true;
      } else if (locText.includes('england') && (!leadLoc.includes('scotland') && !leadLoc.includes('wales') && !leadLoc.includes('northern ireland'))) {
        locMatch = true;
      } else if (locText.includes('scotland') && leadLoc.includes('scotland')) {
        locMatch = true;
      } else if (locText.includes('wales') && leadLoc.includes('wales')) {
        locMatch = true;
      } else if (leadLoc && locText.includes(leadLoc.split(',')[0].trim())) {
        locMatch = true;
      }

      let sectorMatch = false;
      const propOwnership = (leadData.property_ownership || '').toLowerCase();
      
      if (!whoText) {
        sectorMatch = true;
      } else if (propOwnership.includes('commercial') || propOwnership.includes('business')) {
        if (whoText.includes('private sector') || whoText.includes('business') || whoText.includes('non-profit')) {
          sectorMatch = true;
        }
      } else if (propOwnership.includes('residential') || propOwnership.includes('homeowner') || propOwnership.includes('owned') || propOwnership.includes('rented')) {
        if (whoText.includes('personal') || whoText.includes('individual') || whoText.includes('homeowner')) {
          sectorMatch = true;
        }
      } else {
        sectorMatch = true; 
      }

      return locMatch && sectorMatch;
    });
    
    console.log(`Matched ${matched.length} grants for lead`);
  }
}
run();