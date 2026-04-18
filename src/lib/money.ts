/** Round to whole cents (2 decimal places) to avoid float precision drift. */
export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
