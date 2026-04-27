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
      
      // OLD LOGIC
      let locMatch = false;
      if (!locText || locText.includes('national') || locText.includes('england') || locText.includes('uk')) {
        locMatch = true;
      } else if (leadData.location && locText.includes(leadData.location.split(',')[0].trim().toLowerCase())) {
        locMatch = true;
      }

      let sectorMatch = false;
      if (!whoText) {
        sectorMatch = true;
      } else if ((leadData.property_ownership === 'Commercial' || leadData.property_ownership === 'Business') && 
                (whoText.includes('private sector') || whoText.includes('business'))) {
        sectorMatch = true;
      } else if ((leadData.property_ownership === 'Residential' || leadData.property_ownership === 'Homeowner') && 
                (whoText.includes('personal') || whoText.includes('individual'))) {
        sectorMatch = true;
      } else if (!leadData.property_ownership) {
        sectorMatch = true; // Show if we don't know the sector
      }

      return locMatch && sectorMatch;
    });
    
    console.log(`Matched ${matched.length} grants for lead`);
  }
}
run();