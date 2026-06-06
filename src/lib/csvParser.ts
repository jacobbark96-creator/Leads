import Papa from 'papaparse';

/**
 * Fuzzy column mapper to intelligently guess what a CSV column represents
 * regardless of the exact spelling or capitalization used by the user.
 */
export function fuzzyMapColumn(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('company') || normalized.includes('business') || normalized.includes('client') || normalized.includes('organization') || normalized.includes('trading')) {
    return 'company_name';
  }
  
  if (normalized.includes('phone') || normalized.includes('tel') || normalized.includes('number') || normalized.includes('landline') || normalized.includes('mobile') || normalized.includes('cell')) {
    if (normalized.includes('2') || normalized.includes('secondary') || normalized.includes('alt')) {
      return 'secondary_phone';
    }
    if (normalized.includes('1') || normalized.includes('primary')) {
      return 'phone';
    }
    return 'phone';
  }

  if (normalized.includes('email') || normalized.includes('e-mail') || normalized.includes('mail')) {
    return 'email';
  }

  if (normalized.includes('address') || normalized.includes('street') || normalized.includes('location') || normalized.includes('city') || normalized.includes('town') || normalized.includes('county')) {
    return 'address';
  }
  
  if (normalized.includes('postcode') || normalized.includes('zip')) {
    return 'postcode';
  }

  if (normalized.includes('name') || normalized.includes('contact') || normalized.includes('person') || normalized.includes('owner') || normalized.includes('director') || normalized.includes('first') || normalized.includes('last')) {
    return 'contact_name';
  }
  
  if (normalized.includes('website') || normalized.includes('url') || normalized.includes('site') || normalized.includes('domain')) {
    return 'website';
  }

  return null;
}

export function parseCSV(fileContent: string): any[] {
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const records = parsed.data;

  const normalizedRecords = records.map((record: any) => {
    const normalized: any = { _raw: record };
    for (const [key, value] of Object.entries(record)) {
      const mappedKey = fuzzyMapColumn(key);
      if (mappedKey) {
        if (mappedKey === 'phone' && normalized['phone'] && !normalized['secondary_phone']) {
          normalized['secondary_phone'] = value;
        } else if (!normalized[mappedKey]) {
          normalized[mappedKey] = value;
        }
      }
    }
    return normalized;
  });

  return normalizedRecords.filter((r: any) => Object.keys(r).length > 1);
}
