import { fuzzyMapColumn, parseCSV } from './src/lib/csvParser';

const csvData = `Company Name,Contact Name,Address,Phone,Mobile,Email
Acme Corp,John Doe,123 Main St,555-0100,555-0200,john@example.com`;

console.log('\n--- Parse Test 2 ---');
console.log(JSON.stringify(parseCSV(csvData), null, 2));