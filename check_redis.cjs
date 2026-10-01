const Redis = require('ioredis');
const redis = new Redis('redis://127.0.0.1:6379');

async function main() {
  const keys = await redis.keys('bull:*');
  console.log("BullMQ Keys:", keys.length);
  
  // Try to find jobs in bull:company_lookup_queue:*
  const jobs = await redis.keys('bull:*:*');
  let recovered = 0;
  for (const key of jobs) {
    const type = await redis.type(key);
    if (type === 'hash') {
      const data = await redis.hget(key, 'data');
      if (data) {
        // console.log(data);
        recovered++;
      }
    }
  }
  console.log("Recovered job data objects:", recovered);
  process.exit(0);
}
main();
