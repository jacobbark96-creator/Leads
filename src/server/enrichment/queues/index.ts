import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Create a robust Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    // Retry connecting after 2 seconds, but don't spam errors
    return Math.min(times * 50, 2000);
  }
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

connection.on('connect', () => {
  console.log('Successfully connected to Redis for BullMQ');
});

const defaultQueueOptions: any = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 25s, 125s...
    },
    removeOnComplete: true,
    removeOnFail: 1000, // Keep last 1000 failed jobs for debugging
  },
};

// 1. Initial Parsing and Deduplication
export const leadImportQueue = new Queue('lead_import_queue', defaultQueueOptions);

// 2. Company Lookup (Companies House API)
export const companyLookupQueue = new Queue('company_lookup_queue', defaultQueueOptions);

// 3. Address Geocoding (Google Places / Maps)
export const geocodingQueue = new Queue('geocoding_queue', defaultQueueOptions);

// 4. Solar Potential (Google Solar API - Triggered ONLY on qualification)
export const solarAnalysisQueue = new Queue('solar_analysis_queue', defaultQueueOptions);

// 5. Website & Contact Discovery
export const websiteDiscoveryQueue = new Queue('website_discovery_queue', defaultQueueOptions);
export const contactEnrichmentQueue = new Queue('contact_enrichment_queue', defaultQueueOptions);

export { connection };
