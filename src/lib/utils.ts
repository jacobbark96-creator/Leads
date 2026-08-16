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

export function calculateEstimatedSystemSize(
  roofAreaSqmRaw: any,
  monthlySpendRaw: any,
  unitRateRaw?: any
): number | null {
  // Clean strings (remove commas, currency symbols, spaces)
  const parseClean = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    const cleaned = String(val).replace(/[,£$€]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const roofAreaSqm = parseClean(roofAreaSqmRaw);
  const monthlySpend = parseClean(monthlySpendRaw);
  let unitRate = parseClean(unitRateRaw);

  // If unit rate is provided in pence (e.g., 24 instead of 0.24), convert it to pounds
  if (unitRate !== null && unitRate > 1) {
    unitRate = unitRate / 100;
  }
  
  // Default to 0.24 (£0.24) if not provided or 0
  if (!unitRate) {
    unitRate = 0.24;
  }

  if (!roofAreaSqm && !monthlySpend) return null;

  let sizeByRoof: number | null = null;
  let sizeBySpend: number | null = null;

  if (roofAreaSqm) {
    // Calculation 1: Based on roof size
    // Roof size / 2.2 (avg panel size) = max panels
    // Max panels minus 25% = realistic maximum panels
    // real max panels * 550 (commercial panel wattage) = total watts -> divide by 1000 for kWp
    const maxPanels = roofAreaSqm / 2.2;
    const realMaxPanels = maxPanels * 0.75;
    sizeByRoof = (realMaxPanels * 550) / 1000;
  }

  if (monthlySpend) {
    // Calculation 2: Based on monthly spend
    // (monthly spend / unit rate) * 12 = KWh per annum
    // KWh per annum / 950 = KWp system size
    const annualKwh = (monthlySpend / unitRate) * 12;
    sizeBySpend = annualKwh / 950;
  }

  if (sizeByRoof !== null && sizeBySpend !== null) {
    return Math.min(sizeByRoof, sizeBySpend);
  }

  return sizeByRoof ?? sizeBySpend;
}

export function calculateMatchScoreDetails(lead: any, installerPrefs: any) {
  if (!lead || !installerPrefs) return { score: 0, details: {} };

  let totalScore = 0;
  const maxScore = 80;

  // 1. Distance (10 points)
  // 20 miles = 10, 150+ miles = 5
  let distanceScore = 5;
  let actualDistanceMiles: number | null = null;
  if (lead.latitude && lead.longitude && installerPrefs.latitude && installerPrefs.longitude) {
    const dist = calculateDistance(lead.latitude, lead.longitude, installerPrefs.latitude, installerPrefs.longitude);
    actualDistanceMiles = dist;
    if (dist <= 20) {
      distanceScore = 10;
    } else if (dist >= 150) {
      distanceScore = 5;
    } else {
      // Linear interpolation between 20 and 150 miles
      distanceScore = 10 - ((dist - 20) / 130) * 5;
    }
  } else {
    distanceScore = 7; // Default average if no coords
  }
  totalScore += distanceScore;

  // 2. System Size (10 points)
  // Within minimum kWp = 10, below but within 20% = 6, outwith = 4
  let sizeScore = 7;
  if (installerPrefs.min_system_size_kw) {
    const estSize = calculateEstimatedSystemSize(lead.roof_size, lead.monthly_spend, lead.unit_rate);
    if (estSize) {
      const minSize = Number(installerPrefs.min_system_size_kw);
      if (estSize >= minSize) {
        sizeScore = 10;
      } else if (estSize >= minSize * 0.8) {
        sizeScore = 6;
      } else {
        sizeScore = 4;
      }
    }
  } else {
    sizeScore = 10; // If no preference, perfect match
  }
  totalScore += sizeScore;

  // 3. Roof Type (10 points)
  // Matches preferred = 10, does not match = 5 (0 if asbestos and not preferred)
  let roofScore = 7;
  const leadRoof = (lead.roof_type || lead.roof_material || '').toLowerCase();
  const isAsbestosRoof = leadRoof.includes('asbestos');

  if (installerPrefs.preferred_roof_types && installerPrefs.preferred_roof_types.length > 0) {
    const isMatch = installerPrefs.preferred_roof_types.some((rt: string) => 
      leadRoof.includes(rt.toLowerCase())
    );
    if (isMatch) {
      roofScore = 10;
    } else {
      roofScore = isAsbestosRoof ? 0 : 5;
    }
  } else {
    // No preference set (assume they do standard roofs, but not asbestos unless specified)
    roofScore = isAsbestosRoof ? 0 : 10;
  }
  totalScore += roofScore;

  // 4. Monthly Spend (10 points)
  // > 2500 = 10, > 1000 = 9, decreases to 5 incrementally below 1000
  let spendScore = 5;
  const spend = lead.monthly_spend || 0;
  if (spend >= 2500) {
    spendScore = 10;
  } else if (spend >= 1000) {
    spendScore = 9;
  } else if (spend >= 750) {
    spendScore = 8;
  } else if (spend >= 500) {
    spendScore = 7;
  } else if (spend >= 250) {
    spendScore = 6;
  } else {
    spendScore = 5;
  }
  totalScore += spendScore;

  // 5. Timeframe (10 points)
  let timeframeScore = 5;
  const tf = (lead.timeframe || '').toLowerCase();
  if (tf.includes('asap') || tf.includes('emergency') || tf.includes('immediately')) {
    timeframeScore = 10;
  } else if (tf.includes('1-3') || tf.includes('1 - 3') || tf.includes('within 3')) {
    timeframeScore = 8;
  } else if (tf.includes('3-6') || tf.includes('3 - 6')) {
    timeframeScore = 6;
  } else {
    timeframeScore = 4;
  }
  totalScore += timeframeScore;

  // 6. Decision Maker (10 points)
  let decisionScore = 5;
  const dm = (lead.sole_decision_maker !== undefined ? lead.sole_decision_maker : lead.decision_maker || '').toString().toLowerCase();
  if (dm === 'yes' || dm === 'true') {
    decisionScore = 10;
  } else if (dm === 'no' || dm === 'false') {
    decisionScore = 5;
  } else {
    decisionScore = 7;
  }
  totalScore += decisionScore;

  // 7. Ownership (10 points)
  let ownershipScore = 5;
  const owner = (lead.property_ownership || '').toLowerCase();
  if (owner.includes('own')) {
    ownershipScore = 10;
  } else {
    ownershipScore = 5;
  }
  totalScore += ownershipScore;

  // 8. Bills Available (10 points)
  let billsScore = 5;
  const bills = lead.bills_url !== undefined ? lead.bills_url : lead.has_bills_available; // boolean or string
  if (bills === true || bills === 'true' || bills === 'yes' || (typeof bills === 'string' && bills.length > 5)) {
    billsScore = 10;
  } else {
    billsScore = 5;
  }
  totalScore += billsScore;

  let finalPercentage = Math.round((totalScore / maxScore) * 100);

  // Apply -20% penalty if lead is outside installer's working area
  let isOutwithWorkingArea = false;
  if (lead.latitude && lead.longitude && installerPrefs.service_areas && Array.isArray(installerPrefs.service_areas) && installerPrefs.service_areas.length > 0) {
    const isNational = installerPrefs.service_areas.some((sa: any) => sa.radiusMiles === 99999);
    if (!isNational) {
      const isWithinAny = installerPrefs.service_areas.some((sa: any) => {
        if (sa.lat && sa.lng && sa.radiusMiles) {
          const dist = calculateDistance(lead.latitude, lead.longitude, sa.lat, sa.lng);
          return dist <= sa.radiusMiles;
        }
        return false;
      });
      if (!isWithinAny) {
        isOutwithWorkingArea = true;
      }
    }
  }

  if (isOutwithWorkingArea) {
    finalPercentage = Math.max(0, finalPercentage - 20);
  }

  return {
      score: finalPercentage,
      details: {
        distance: Math.round(distanceScore),
        distanceMiles: actualDistanceMiles ? Math.round(actualDistanceMiles) : null,
        systemSize: Math.round(sizeScore),
      roofType: Math.round(roofScore),
      monthlySpend: Math.round(spendScore),
      timeframe: Math.round(timeframeScore),
      decisionMaker: Math.round(decisionScore),
      ownership: Math.round(ownershipScore),
      billsAvailable: Math.round(billsScore),
      outwithWorkingArea: isOutwithWorkingArea
    }
  };
}

export function calculateMatchScore(lead: any, installerPrefs: any): number {
  return calculateMatchScoreDetails(lead, installerPrefs).score;
}

export function calculateIndicativeSystemValue(kwp: number | null | undefined): { central: number, rangeMin: number, rangeMax: number, rate: number, isCommercial: boolean } | null {
  if (!kwp || isNaN(kwp) || kwp <= 0) return null;
  
  let rate = 900; // existing fallback for < 10 kWp
  let isCommercial = false;
  
  if (kwp >= 500) {
    rate = 750;
    isCommercial = true;
  } else if (kwp >= 250) {
    rate = 800;
    isCommercial = true;
  } else if (kwp >= 100) {
    rate = 875;
    isCommercial = true;
  } else if (kwp >= 50) {
    rate = 950;
    isCommercial = true;
  } else if (kwp >= 10) {
    rate = 1050;
    isCommercial = true;
  }
  
  const central = kwp * rate;
  
  // Calculate range +/- 10%
  const rawMin = central * 0.9;
  const rawMax = central * 1.1;
  
  const roundToSensible = (val: number) => {
    if (val >= 100000) return Math.round(val / 1000) * 1000;
    if (val >= 10000) return Math.round(val / 1000) * 1000;
    return Math.round(val / 100) * 100;
  };

  return {
    central,
    rangeMin: roundToSensible(rawMin),
    rangeMax: roundToSensible(rawMax),
    rate,
    isCommercial
  };
}

export function formatSensibleCurrency(val: number): string {
  if (val >= 1000000) return `£${(val / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
  if (val >= 10000) return `£${Math.round(val / 1000)}k`;
  return `£${val.toLocaleString('en-GB')}`;
}
