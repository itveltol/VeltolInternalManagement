import type { Activity } from "@/features/matrice/types";

/**
 * Document label -> Matrice activity name, for the two fixed labels that name
 * the same real-world document as an existing Matrice activity. Keyed by
 * name (not activity.id) because activity ids come from a `generated always
 * as identity` column whose values depend on seed insertion order — matching
 * by name stays correct even if the catalog is ever reseeded. Mirrors the
 * precedent in matrice/services/checklistActivityMapping.ts.
 */
export const LABEL_TO_ACTIVITY_NAME: Record<string, string> = {
  "CU daca exista": "Certificatul de Urbanism",
  "AC daca exista": "Autorizație de Construcție - AC",
};

/** Resolves the Matrice activity id for a unified label, given the current activity catalog. */
export function resolveActivityIdForLabel(label: string, activities: Activity[]): number | null {
  const name = LABEL_TO_ACTIVITY_NAME[label];
  if (!name) return null;
  return activities.find((a) => a.name === name)?.id ?? null;
}

/** Resolves the unified label for a Matrice activity id, given the current activity catalog (inverse of resolveActivityIdForLabel). */
export function resolveLabelForActivityId(activityId: number, activities: Activity[]): string | null {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) return null;
  const entry = Object.entries(LABEL_TO_ACTIVITY_NAME).find(([, name]) => name === activity.name);
  return entry ? entry[0] : null;
}

/** Parses a "matrice_cell" document's linked_id ("projectId:activityId") into its activity id, or null if malformed. */
export function parseMatriceCellActivityId(linkedId: string): number | null {
  const parts = linkedId.split(":");
  if (parts.length !== 2) return null;
  const activityId = Number(parts[1]);
  return Number.isFinite(activityId) ? activityId : null;
}
