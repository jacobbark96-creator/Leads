import { parse } from 'csv-parse/sync';

/**
 * Fuzzy column mapper to intelligently guess what a CSV column represents
 * regardless of the exact spelling or capitalization used by the user.
 */
export function fuzzyMapColumn(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (['company', 'companyname', 'business', 'businessname', 'client', 'organization', 'name'].includes(normalized)) {
    return 'company_name';
  }
  
  if (['phone', 'phonenumber', 'landline', 'contactnumber', 'tel', 'telephone'].includes(normalized)) {
    return 'phone';
  }
  
  if (['mobile', 'cell', 'cellphone'].includes(normalized)) {
    return 'mobile';
  }

  if (['address', 'street', 'location', 'fulladdress', 'siteaddress'].includes(normalized)) {
    return 'address';
  }
  
  if (['postcode', 'zip', 'zipcode', 'postalcode'].includes(normalized)) {
    return 'postcode';
  }
  
  if (['website', 'url', 'site', 'domain'].includes(normalized)) {
    return 'website';
  }
  
  if (['email', 'emailaddress'].includes(normalized)) {
    return 'email';
  }

  return null;
}

export function parseCSV(fileContent: string | Buffer): any[] {
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const normalizedRecords = records.map((record: any) => {
    const normalized: any = { _raw: record };
    for (const [key, value] of Object.entries(record)) {
      const mappedKey = fuzzyMapColumn(key);
      if (mappedKey) {
        normalized[mappedKey] = value;
      }
    }
    return normalized;
  });

  return normalizedRecords.filter((r: any) => Object.keys(r).length > 1);
}
