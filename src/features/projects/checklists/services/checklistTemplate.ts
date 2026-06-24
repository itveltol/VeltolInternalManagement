import type {
  ChecklistTemplateRow,
  ChecklistItemRecord,
  ChecklistRow,
  ChecklistPhase,
  SectionSummary,
} from "@/features/projects/checklists/types";

const SECTION_CODES = new Set([
  "I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"
]);

function row(
  prefix: string,
  cod: string,
  number: number,
  activitate: string,
  plan_total: number | null,
  zile: number | null,
  target_zi: number | null,
  phase: ChecklistPhase,
): ChecklistTemplateRow {
  return { rowKey: `${prefix}-${number}`, cod, number, activitate, plan_total, zile, target_zi, isSection: SECTION_CODES.has(cod), phase };
}

export const PV_TEMPLATE: ChecklistTemplateRow[] = [
  // ── Section I: STRUCTURA ─────────────────────────────────────────────
  row("pv", "I",   1,  "STRUCTURA",                                    null, null, null, "structura"),
  row("pv", "1.1", 2,  "Împrejmuire stâlpi",                           null, 5,    null, "structura"),  // NOTE: quantity=30 in PV_PARK_A variant
  row("pv", "1.2", 3,  "Împrejmuire panou bordurat",                   null, 5,    null, "structura"),
  row("pv", "1.3", 4,  "Batere stâlpi",                                null, 12,   null, "structura"),
  row("pv", "1.4", 5,  "Montaj grinzi longitudinale",                  null, 6,    null, "structura"),
  row("pv", "1.5", 6,  "Montaj grinzi verticale",                      null, 6,    null, "structura"),

  // ── Section II: MONTAJ PANOURI ───────────────────────────────────────
  row("pv", "II",  7,  "MONTAJ PANOURI",                               null, null, null, "montaj_panouri"),
  row("pv", "2.1", 8,  "Montaj panouri",                               null, 8,    null, "montaj_panouri"),
  row("pv", "2.2", 9,  "Montaj jgheab metalic / trasee cabluri",       null, 6,    null, "montaj_panouri"),
  row("pv", "2.3", 10, "Realizare cablaj stringuri",                   null, 6,    null, "montaj_panouri"),

  // ── Section III: CABLAJ AC + ÎMPĂMÂNTARE ─────────────────────────────
  row("pv", "III", 11, "CABLAJ AC + ÎMPĂMÂNTARE",                      null, null, null, "cablaj_ac"),
  row("pv", "3.1", 12, "Săpături trasee cabluri AC",                   null, 10,   null, "cablaj_ac"),
  row("pv", "3.2", 13, "Realizare împământare (țăruși + platbandă)",   null, 4,    null, "cablaj_ac"),
  row("pv", "3.3", 14, "Pozare cabluri AC (forță + iluminat)",         null, 4,    null, "cablaj_ac"),
  row("pv", "3.4", 15, "Fundații + plantare stâlpi iluminat",          null, 3,    null, "cablaj_ac"),
  row("pv", "3.5", 16, "Piese separație + împământare mese",           null, 2,    null, "cablaj_ac"),

  // ── Section IV: INVERTOARE & TABLOURI ───────────────────────────────
  row("pv", "IV",  17, "INVERTOARE & TABLOURI",                        null, null, null, "invertoare"),
  row("pv", "4.1", 18, "Montaj invertoare + tablouri colectoare AC",   null, 4,    null, "invertoare"),

  // ── Section V: CONEXIUNI INVERTOARE & TEC ───────────────────────────
  row("pv", "V",   19, "CONEXIUNI INVERTOARE & TEC",                   null, null, null, "conexiuni"),
  row("pv", "5.1", 20, "Conexiuni AC invertoare",                      null, 6,    null, "conexiuni"),
  row("pv", "5.2", 21, "Conexiuni tablouri electrice AC",              null, 7,    null, "conexiuni"),
  row("pv", "5.3", 22, "Conexiuni TDRI - PTAB",                        null, 3,    null, "conexiuni"),

  // ── Section VI: POST DE TRANSFORMARE ────────────────────────────────
  row("pv", "VI",  23, "POST DE TRANSFORMARE",                         null, null, null, "post_transformare"),
  row("pv", "6.1", 24, "Fundație post trafo",                          null, 3,    null, "post_transformare"),
  row("pv", "6.2", 25, "Amplasare posturi trafo + macara",             null, 2,    null, "post_transformare"),
  row("pv", "6.3", 26, "Amplasare transformatoare + macara",           null, 2,    null, "post_transformare"),
  row("pv", "6.4", 27, "Cablare posturi trafo",                        null, 4,    null, "post_transformare"),

  // ── Section VII: VERIFICĂRI ÎNAINTEA RECEPȚIEI ──────────────────────
  row("pv", "VII", 28, "VERIFICĂRI ÎNAINTEA RECEPȚIEI",                null, null, null, "verificari"),
  row("pv", "7.1", 29, "Verificări electrice + măsurători + probe",    null, 3,    null, "verificari"),
];

export const BESS_TEMPLATE: ChecklistTemplateRow[] = [
  // ── Section I: PREGĂTIRE TEREN ───────────────────────────────────────
  row("bess", "VIII",   1,  "PREGĂTIRE TEREN",                              null, null, null, "pregatire_teren_bess"),
  row("bess", "8.1", 2,  "Împrejmuire BESS",                             null, 3,    null, "pregatire_teren_bess"),
  row("bess", "8.2", 3,  "Iluminat",                                     null, 2,    null, "pregatire_teren_bess"),
  row("bess", "8.3", 4,  "Sistem de camere",                             null, 2,    null, "pregatire_teren_bess"),

  // ── Section II: CONSTRUCȚII ──────────────────────────────────────────
  row("bess", "IX",  5,  "CONSTRUCȚII",                                  null, null, null, "constructii_bess"),
  row("bess", "9.1", 6,  "Fundație BESS",                                null, 5,    null, "constructii_bess"),

  // ── Section III: MONTAJ ──────────────────────────────────────────────
  row("bess", "X", 7,  "MONTAJ",                                       null, null, null, "montaj_bess"),
  row("bess", "10.1", 8,  "Închiriere macara + amplasare containere BESS",null, 2,    null, "montaj_bess"),
  row("bess", "10.2", 9,  "Cablare interioară BESS",                      null, 4,    null, "montaj_bess"),

  // ── Section IV: CONECTARE ────────────────────────────────────────────
  row("bess", "XI",  10, "CONECTARE",                                    null, null, null, "conectare_bess"),
  row("bess", "11.1", 11, "Racord BESS la rețea",                         null, 2,    null, "conectare_bess"),
  row("bess", "11.2", 12, "Conexiuni date / SCADA",                       null, 2,    null, "conectare_bess"),

  // ── Section V: VERIFICĂRI ────────────────────────────────────────────
  row("bess", "XII",   13, "VERIFICĂRI",                                   null, null, null, "verificari_bess"),
  row("bess", "12.1", 14, "Verificări electrice + probe",                 null, 3,    null, "verificari_bess"),
];

// ── Composed checklist: PV Park A + BESS + PV Park B ─────────────────
// PV_PARK_A: row 1.1 has quantity=30 (override as needed)
export const CHECKLIST_TEMPLATE: ChecklistTemplateRow[] = [
  ...PV_TEMPLATE,
  ...BESS_TEMPLATE,
];

export function mergeChecklistRows(
  records: ChecklistItemRecord[],
): ChecklistRow[] {
  const recordMap = new Map(records.map((r) => [r.item_number, r]));

  return CHECKLIST_TEMPLATE.map((tmpl) => {
    const record = recordMap.get(tmpl.number) ?? null;

    // DB values take precedence over static template defaults
    const plan_total = record?.plan_total ?? tmpl.plan_total;
    const zile       = record?.zile       ?? tmpl.zile;
    const target_zi  = record?.target_zi  ?? tmpl.target_zi;
    const realizat   = record?.realizat   ?? null;

    let pct: number | null = null;
    if (!tmpl.isSection && plan_total != null && realizat != null) {
      pct = Math.min(100, Math.max(0, (realizat / plan_total) * 100));
    }

    return { ...tmpl, plan_total, zile, target_zi, record, pct };
  });
}

export function computeSectionSummaries(rows: ChecklistRow[]): SectionSummary[] {
  const ordered: ChecklistPhase[] = [
    "structura",
    "montaj_panouri",
    "cablaj_ac",
    "invertoare",
    "conexiuni",
    "post_transformare",
    "verificari",
    "pregatire_teren_bess",
    "constructii_bess",
    "montaj_bess",
    "conectare_bess",
    "verificari_bess",
  ];

  const LABELS: Record<ChecklistPhase, string> = {
    structura: "STRUCTURA",
    montaj_panouri: "MONTAJ PANOURI",
    cablaj_ac: "CABLAJ AC",
    invertoare: "INVERTOARE",
    conexiuni: "CONEXIUNI",
    post_transformare: "POST TRAFO",
    verificari: "VERIFICĂRI",
    montaj_bess: "MONTAJ BESS",
    pregatire_teren_bess: "PREGĂTIRE TEREN BESS",
    constructii_bess: "CONSTRUCȚII BESS",
    conectare_bess: "CONECTARE BESS",
    verificari_bess: "VERIFICĂRI BESS",
  };

  const map = new Map<
    ChecklistPhase,
    { total: number; pctSum: number; completed: number }
  >();

  for (const row of rows) {
    if (row.isSection) continue;
    const entry = map.get(row.phase) ?? { total: 0, pctSum: 0, completed: 0 };
    entry.total++;
    if (row.pct !== null) {
      entry.pctSum += row.pct;
      if (row.pct >= 100) entry.completed++;
    }
    map.set(row.phase, entry);
  }

  return ordered
    .filter((phase) => map.has(phase))
    .map((phase, idx) => {
      const e = map.get(phase)!;
      return {
        phase,
        sectionNumber: idx + 1,
        label: LABELS[phase],
        totalItems: e.total,
        completedItems: e.completed,
        avgPct: e.total > 0 ? e.pctSum / e.total : 0,
      };
    });
}
