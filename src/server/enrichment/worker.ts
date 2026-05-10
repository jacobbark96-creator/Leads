import { geocodingWorker } from './workers/geocoding.worker.ts';
import { solarAnalysisWorker } from './workers/solarAnalysis.worker.ts';
import { companyLookupWorker } from './workers/companyLookup.worker.ts';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('🚀 Starting Enrichment Engine Workers...');
console.log('✅ Geocoding Worker initialized (Listening to geocoding_queue)');
console.log('✅ Solar Analysis Worker initialized (Listening to solar_analysis_queue)');
console.log('✅ Company Lookup Worker initialized (Listening to company_lookup_queue)');

// Handle graceful shutdowns
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, closing workers...`);
  await geocodingWorker.close();
  await solarAnalysisWorker.close();
  await companyLookupWorker.close();
  console.log('All workers closed. Exiting process.');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60);
