const fs = require('fs');
const content = fs.readFileSync('src/lib/utils.ts', 'utf-8');

const matchCode = content.substring(content.indexOf('export function calculateMatchScore'), content.indexOf('export function formatTime'));
const distanceCode = content.substring(content.indexOf('function calculateDistance'), content.indexOf('export function extractTown'));
const sizeCode = content.substring(content.indexOf('export function calculateEstimatedSystemSize'), content.indexOf('export function calculateMatchScore'));

// Convert TS to JS by just stripping types for eval
let runCode = `
${distanceCode.replace(/export /g, '').replace(/: number/g, '').replace(/: any/g, '').replace(/: string/g, '')}
${sizeCode.replace(/export /g, '').replace(/: number \| null/g, '').replace(/: any/g, '').replace(/: number/g, '')}
${matchCode.replace(/export /g, '').replace(/: number/g, '').replace(/: any/g, '').replace(/\(rt: string\)/g, '(rt)')}

const lead = {
  latitude: 51.5,
  longitude: -0.1,
  roof_size: 1000,
  monthly_spend: 3000,
  roof_type: 'metal',
  timeframe: 'asap',
  decision_maker: 'yes',
  property_ownership: 'own',
  bills_url: 'yes'
};
const prefs = {
  latitude: 51.5,
  longitude: -0.1,
  min_system_size_kw: 10,
  preferred_roof_types: ['metal']
};

console.log('Score:', calculateMatchScore(lead, prefs));
`;
try {
  eval(runCode);
} catch (e) {
  console.log("Error in eval:");
  console.log(e);
}
