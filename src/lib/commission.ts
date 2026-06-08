export function calculateCommission(leadPrice: number | null | undefined, isLeadShare: boolean = false): number {
  if (isLeadShare) return 33;
  if (!leadPrice) return 0;
  
  if (leadPrice >= 385) return 130;
  if (leadPrice >= 285) return 100;
  // Based on instructions: £135 -> £35, £185 -> £35
  if (leadPrice >= 135) return 35;
  
  // Default fallback if below 135, maybe 0 or proportional?
  // I will just return 0 if it's below the lowest tier, or maybe 35 if > 0.
  // The prompt only lists 135, 185, 285, 385.
  if (leadPrice > 0) return 35;
  
  return 0;
}