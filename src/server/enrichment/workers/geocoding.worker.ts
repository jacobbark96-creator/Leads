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

export const geocodingWorker = new Worker(
  'geocoding_queue',
  async (job) => {
    console.log(`[Geocoding Worker] Processing job ${job.id} for lead: ${job.data.lead_id}`);
    const { lead_id, address, company_name } = job.data;

    console.log(`[Geocoding Worker] Processing lead: ${lead_id}`);

    try {
      // 1. Geocode Address or Search by Company Name
      let lat: number | null = null;
      let lng: number | null = null;
      let formattedAddress = address;
      let buildingType: string | null = null;

      if (address && address.length > 5) {
        // Standard Geocoding
        const geoResponse = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
          params: { address, key: GOOGLE_API_KEY }
        });
        
        if (geoResponse.data.results && geoResponse.data.results.length > 0) {
          const location = geoResponse.data.results[0].geometry.location;
          lat = location.lat;
          lng = location.lng;
          formattedAddress = geoResponse.data.results[0].formatted_address;
        }
      } 
      
      // Fallback: If no lat/lng from address, search via Google Places API using Company Name
      if ((!lat || !lng) && company_name) {
        console.log(`[Geocoding Worker] Falling back to Places API for ${company_name}`);
        const placesResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json`, {
          params: {
            input: company_name,
            inputtype: 'textquery',
            fields: 'geometry,formatted_address,types',
            key: GOOGLE_API_KEY
          }
        });

        if (placesResponse.data.candidates && placesResponse.data.candidates.length > 0) {
          const candidate = placesResponse.data.candidates[0];
          const location = candidate.geometry.location;
          lat = location.lat;
          lng = location.lng;
          formattedAddress = candidate.formatted_address;
          
          if (candidate.types && candidate.types.length > 0) {
             buildingType = candidate.types[0].replace(/_/g, ' ');
          }
        }
      }

      if (!lat || !lng) {
        throw new Error('Could not resolve location for lead');
      }

      // If we used address geocoding, we can optionally reverse geocode or do a place search to get buildingType
      if (!buildingType) {
         const reverseGeo = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json`, {
           params: { location: `${lat},${lng}`, radius: 10, key: GOOGLE_API_KEY }
         });
         if (reverseGeo.data.results && reverseGeo.data.results.length > 0) {
            buildingType = reverseGeo.data.results[0].types?.[0]?.replace(/_/g, ' ') || null;
         }
      }

      // 2. Fetch Aerial Satellite Image
      console.log(`[Geocoding Worker] Fetching satellite image for ${lat}, ${lng}`);
      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=600x600&maptype=satellite&key=${GOOGLE_API_KEY}`;
      
      const imageResponse = await axios.get(mapUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');

      // 3. Upload to Supabase Storage
      const fileName = `satellite_${lead_id}_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('buildings') // Ensure this bucket exists in Supabase
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage.from('buildings').getPublicUrl(fileName);
      const satelliteUrl = publicUrlData.publicUrl;

      // 4. Update the Buildings Table
      console.log(`[Geocoding Worker] Updating building record for lead ${lead_id}`);
      
      // Ensure a company record exists first to link to
      let companyId = null;
      const { data: companyData } = await supabase.from('companies').select('id').eq('lead_id', lead_id).single();
      
      if (companyData) {
        companyId = companyData.id;
      } else {
        // Create a stub company if lookup worker hasn't finished yet
        const { data: newCompany } = await supabase.from('companies').insert([{ lead_id, normalized_name: company_name }]).select().single();
        companyId = newCompany?.id;
      }

      // Upsert building record
      const { error: buildingError } = await supabase
        .from('buildings')
        .upsert({
          lead_id,
          company_id: companyId,
          latitude: lat,
          longitude: lng,
          satellite_image_url: satelliteUrl,
          property_type: buildingType
        }, { onConflict: 'lead_id' }); // Assuming lead_id is uniquely constrained, otherwise match logic

      if (buildingError) throw buildingError;

      // Also update the leads table with the cleaner address if we found one
      if (formattedAddress && formattedAddress !== address) {
        await supabase.from('leads').update({ location: formattedAddress }).eq('id', lead_id);
      }

      return { success: true, lat, lng, satelliteUrl };

    } catch (error: any) {
      console.error(`[Geocoding Worker Error]`, error.message);
      throw error;
    }
  },
  { connection }
);
