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
