import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractTown(address: string | null | undefined): string {
  if (!address) return 'Undisclosed Location';
  
  // 1. Remove "UK" or "United Kingdom" from the end
  let clean = address.replace(/,\s*(UK|United Kingdom)$/i, '');
  
  // 2. Remove standard UK Postcodes (e.g., M1 1AA, SW1A 1AA, B1 1AA)
  clean = clean.replace(/,?\s*\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/i, '');
  
  // 3. Split by comma and get the last part
  const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
  
  if (parts.length > 1) {
    return parts[parts.length - 1]; // Returns the town/city
  }
  
  return parts[0] || 'Undisclosed Location';
}

const MAJOR_CITIES = [
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
  { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
  { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
  { name: 'Bristol', lat: 51.4545, lng: -2.5879 },
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178 },
  { name: 'Sheffield', lat: 53.3811, lng: -1.4701 },
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  { name: 'Cardiff', lat: 51.4816, lng: -3.1791 },
  { name: 'Belfast', lat: 54.5973, lng: -5.9301 },
  { name: 'Nottingham', lat: 52.9548, lng: -1.1581 },
  { name: 'Leicester', lat: 52.6369, lng: -1.1398 },
  { name: 'Southampton', lat: 50.9097, lng: -1.4044 },
  { name: 'Portsmouth', lat: 50.8198, lng: -1.0880 },
  { name: 'Aberdeen', lat: 57.1497, lng: -2.0943 },
  { name: 'Plymouth', lat: 50.3755, lng: -4.1427 },
  { name: 'Cambridge', lat: 52.2053, lng: 0.1218 },
  { name: 'Oxford', lat: 51.7520, lng: -1.2577 }
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = (θ * 180 / Math.PI + 360) % 360;

  const directions = ['North', 'N/E', 'East', 'S/E', 'South', 'S/W', 'West', 'N/W'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

export function getVagueLocation(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (!lat || !lng) return null;

  // Find the nearest major city
  let nearestCity = MAJOR_CITIES[0];
  let minDistance = calculateDistance(lat, lng, nearestCity.lat, nearestCity.lng);

  for (let i = 1; i < MAJOR_CITIES.length; i++) {
    const dist = calculateDistance(lat, lng, MAJOR_CITIES[i].lat, MAJOR_CITIES[i].lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = MAJOR_CITIES[i];
    }
  }

  const direction = calculateBearing(nearestCity.lat, nearestCity.lng, lat, lng);
  
  // If very close (under 3 miles), just say "In [City]" or something similar
  if (minDistance < 3) {
    return `Within ${nearestCity.name}`;
  }

  // Round to nearest 5 miles for vagueness
  const roundedDist = Math.max(5, Math.round(minDistance / 5) * 5);
  
  // If it's a suburb style (e.g. Altrincham to Manchester)
  if (minDistance < 12) {
    return `${direction} ${nearestCity.name}`;
  }

  return `Around ${roundedDist} miles ${direction} of ${nearestCity.name}`;
}
