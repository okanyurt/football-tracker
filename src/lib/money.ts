/** Round up to whole number to avoid float precision drift. */
export function roundCents(amount: number): number {
  return Math.ceil(amount);
}
