export const PM_COLOR_PALETTE = ["#2F6BED", "#16A34A", "#E0A312", "#DC2626", "#9333EA", "#0891B2", "#DB2777", "#65A30D"];

const NEUTRAL = "#94A3B8"; // no PM assigned

function hashColor(pmId: string): string {
  let hash = 0;
  for (let i = 0; i < pmId.length; i++) {
    hash = (hash * 31 + pmId.charCodeAt(i)) | 0;
  }
  return PM_COLOR_PALETTE[Math.abs(hash) % PM_COLOR_PALETTE.length];
}

/**
 * Color for a project manager's schedule cards. Prefers the admin-assigned
 * color (from pm_colors); falls back to a deterministic hash of the PM's id
 * so PMs without one yet still get a stable, distinct color.
 */
export function pmColor(pmId: string | null | undefined, assignedColors?: ReadonlyMap<string, string>): string {
  if (!pmId) return NEUTRAL;
  return assignedColors?.get(pmId) ?? hashColor(pmId);
}
