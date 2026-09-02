/** Extracts the leading sequential number from a "N/YYYY-MM-DD" contract
 * number (or a bare legacy numeric string). Returns null if unparseable. */
export function parseContractNumber(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw.split("/")[0]);
  return Number.isFinite(n) ? n : null;
}
