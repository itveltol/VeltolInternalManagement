import type { Activity } from "../types";

/**
 * Checklist item_number -> Matrice activity name, for the ~28 execution/BESS
 * tasks that exist in both catalogs (Matrice phase_no 9 "Execuție" and
 * phase_no 10 "Montaj BESS"). Keyed by name (not activity.id) because
 * activity ids come from a `generated always as identity` column whose
 * values depend on seed insertion order — matching by name stays correct
 * even if the catalog is ever reseeded. phase_no 8 (procurement) has no
 * checklist equivalent and is intentionally absent from this map.
 */
export const CHECKLIST_ITEM_TO_ACTIVITY_NAME: Record<number, string> = {
  // PV_TEMPLATE (STRUCTURA)
  2: "Împrejmuire – Stâlpuri",
  3: "Împrejmuire – Panou Bordurat",
  4: "Batere Stâlpi",
  5: "Montaj Grinzi Longitudinale",
  6: "Montaj Grinzi Verticale",
  // MONTAJ PANOURI
  // NOTE: item 8 ("Montaj panouri") is intentionally NOT mapped — Matrice
  // has two similarly-named activities here ("Montaj Panouri" and "Montaj
  // Panouri Fotovoltaice"); which one the checklist item corresponds to is
  // ambiguous, so this cell is left manually editable in Matrice rather than
  // guessing. Flagged for follow-up with whoever owns the Matrice catalog.
  9: "Montaj Jgheab Metalic / Trasee Cabluri Solare",
  10: "Realizare Cablaj Stringuri",
  // CABLAJ AC + ÎMPĂMÂNTARE
  12: "Săpături Trasee Cabluri AC",
  13: "Realizare Împământare (Țăruși + Platbandă)",
  14: "Pozare Cabluri AC (Forță + Iluminat + Camere)",
  15: "Fundații + Plantare Stâlpi Iluminat",
  16: "Montaj Piese Separație + Trasee Împământare + Paratrăsnet",
  // INVERTOARE & TABLOURI
  18: "Montaj Invertoare + Tablouri Colectoare AC (TEC)",
  // CONEXIUNI INVERTOARE & TEC
  20: "Realizare Conexiuni AC Invertoare",
  21: "Realizare Conexiuni Tablouri Electrice AC",
  22: "Realizare Conexiuni TDRI / PTAB",
  // POST DE TRANSFORMARE
  24: "Fundație Posturi Trafo",
  25: "Amplasare Posturi Trafo + Macara",
  26: "Amplasare Transformatoare + Macara",
  27: "Cablare Posturi Trafo",
  // VERIFICĂRI ÎNAINTEA RECEPȚIEI
  29: "Verificări Înaintea Recepției",
  // BESS_TEMPLATE (PREGĂTIRE TEREN)
  31: "Împrejmuire",
  32: "Iluminat",
  33: "Sistem de camere",
  // CONSTRUCȚII
  35: "Fundație",
  // MONTAJ
  37: "Închiriere macara",
  38: "Cablare",
  // CONECTARE
  40: "Racord",
};

function buildActivityIdByName(activities: Activity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of activities) map.set(a.name, a.id);
  return map;
}

/** Resolves the mapped Matrice activity id for a checklist item_number, given the current activity catalog. */
export function resolveMappedActivityId(
  itemNumber: number,
  activities: Activity[],
): number | null {
  const name = CHECKLIST_ITEM_TO_ACTIVITY_NAME[itemNumber];
  if (!name) return null;
  return buildActivityIdByName(activities).get(name) ?? null;
}

/** Builds the reverse lookup (activity id -> checklist item_number) for the current activity catalog. */
export function buildDerivedActivityIds(activities: Activity[]): Set<number> {
  const nameToItem = new Map(
    Object.entries(CHECKLIST_ITEM_TO_ACTIVITY_NAME).map(([item, name]) => [name, Number(item)]),
  );
  const ids = new Set<number>();
  for (const a of activities) {
    if (nameToItem.has(a.name)) ids.add(a.id);
  }
  return ids;
}

function normalizeLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Dev-time audit only (not on any write path): flags checklist/Matrice label
 * pairs in CHECKLIST_ITEM_TO_ACTIVITY_NAME whose normalized forms no longer
 * agree with a still-current activity name, so catalog drift shows up as a
 * warning instead of a silently-broken mapping.
 */
export function auditMappingDrift(activities: Activity[]): string[] {
  const byNormalizedName = new Map(activities.map((a) => [normalizeLabel(a.name), a.name]));
  const warnings: string[] = [];
  for (const [item, expectedName] of Object.entries(CHECKLIST_ITEM_TO_ACTIVITY_NAME)) {
    const actual = byNormalizedName.get(normalizeLabel(expectedName));
    if (!actual) {
      warnings.push(`Checklist item ${item}: no Matrice activity matches "${expectedName}" (even normalized).`);
    }
  }
  return warnings;
}
