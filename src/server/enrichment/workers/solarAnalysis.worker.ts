import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { connection } from '../queues/index';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export const solarAnalysisWorker = new Worker(
  'solar_analysis_queue',
  async (job: Job) => {
    const { lead_id } = job.data;

    console.log(`[Solar Worker] Processing solar analysis for lead: ${lead_id}`);

    try {
      // 1. Get Lat/Lng from building record
      const { data: buildingData, error: fetchError } = await supabase
        .from('buildings')
        .select('latitude, longitude')
        .eq('lead_id', lead_id)
        .single();

      if (fetchError || !buildingData?.latitude || !buildingData?.longitude) {
        throw new Error('Building location not found. Geocoding must finish before Solar API.');
      }

      const { latitude, longitude } = buildingData;

      // 2. Call Google Solar API (Building Insights)
      // Note: Requires Google Solar API to be enabled in GCP console
      const solarUrl = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${latitude}&location.longitude=${longitude}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`;
      
      const response = await axios.get(solarUrl);
      const insights = response.data;

      if (!insights || !insights.solarPotential) {
         throw new Error('No solar potential data returned from Google.');
      }

      const potential = insights.solarPotential;
      
      // 3. Parse Insights
      const maxPanels = potential.maxArrayPanelsCount || 0;
      const maxSunshine = potential.maxSunshineHoursPerYear || 0;
      
      // Basic scoring algorithm (can be made much more complex)
      let score = 0;
      if (maxPanels > 100) score += 40;
      else if (maxPanels > 20) score += 20;
      
      if (maxSunshine > 1000) score += 40;
      else if (maxSunshine > 500) score += 20;

      // 4. Update the Buildings Table
      console.log(`[Solar Worker] Saving solar data for lead ${lead_id}`);
      
      const { error: updateError } = await supabase
        .from('buildings')
        .update({
          max_array_panels_count: maxPanels,
          max_sunshine_hours_per_year: maxSunshine,
          solar_potential_score: score,
          roof_area_estimate: potential.wholeRoofStats?.areaMeters2 || null
        })
        .eq('lead_id', lead_id);

      if (updateError) throw updateError;

      return { success: true, maxPanels, score };

    } catch (error: any) {
      console.error(`[Solar Worker Error]`, error.message);
      throw error;
    }
  },
  { connection }
);
