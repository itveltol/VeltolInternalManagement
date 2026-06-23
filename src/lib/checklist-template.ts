import type {
  ChecklistTemplateRow,
  ChecklistItemRecord,
  ChecklistRow,
  ChecklistPhase,
  SectionSummary,
} from "./types/checklist";

const SECTION_CODES = new Set([
  "I","II","III","IV","V","VI","VII","VIII","IX","X",
]);

function row(
  cod: string,
  number: number,
  activitate: string,
  plan_total: number | null,
  zile: number | null,
  target_zi: number | null,
  phase: ChecklistPhase,
): ChecklistTemplateRow {
  return { cod, number, activitate, plan_total, zile, target_zi, isSection: SECTION_CODES.has(cod), phase };
}

export const CHECKLIST_TEMPLATE: ChecklistTemplateRow[] = [
  // ── Section I: STRUCTURA ─────────────────────────────────────────────
  row("I",   1,  "STRUCTURA",                                    null, null, null, "structura"),
  row("1.1", 2,  "Împrejmuire stâlpi",                           30,   5,    null, "structura"),
  row("1.2", 3,  "Împrejmuire panou bordurat",                   null, 5,    null, "structura"),
  row("1.3", 4,  "Batere stâlpi",                                null, 12,   null, "structura"),
  row("1.4", 5,  "Montaj grinzi longitudinale",                  null, 6,    null, "structura"),
  row("1.5", 6,  "Montaj grinzi verticale",                      null, 6,    null, "structura"),

  // ── Section II: MONTAJ PANOURI ───────────────────────────────────────
  row("II",  7,  "MONTAJ PANOURI",                               null, null, null, "montaj_panouri"),
  row("2.1", 8,  "Montaj panouri",                               null, 8,    null, "montaj_panouri"),
  row("2.2", 9,  "Montaj jgheab metalic / trasee cabluri",       null, 6,    null, "montaj_panouri"),
  row("2.3", 10, "Realizare cablaj stringuri",                   null, 6,    null, "montaj_panouri"),

  // ── Section III: CABLAJ AC + ÎMPĂMÂNTARE ─────────────────────────────
  row("III", 11, "CABLAJ AC + ÎMPĂMÂNTARE",                      null, null, null, "cablaj_ac"),
  row("3.1", 12, "Săpături trasee cabluri AC",                   null, 10,   null, "cablaj_ac"),
  row("3.2", 13, "Realizare împământare (țăruși + platbandă)",   null, 4,    null, "cablaj_ac"),
  row("3.3", 14, "Pozare cabluri AC (forță + iluminat)",         null, 4,    null, "cablaj_ac"),
  row("3.4", 15, "Fundații + plantare stâlpi iluminat",          null, 3,    null, "cablaj_ac"),
  row("3.5", 16, "Piese separație + împământare mese",           null, 2,    null, "cablaj_ac"),

  // ── Section IV: INVERTOARE & TABLOURI ───────────────────────────────
  row("IV",  17, "INVERTOARE & TABLOURI",                        null, null, null, "invertoare"),
  row("4.1", 18, "Montaj invertoare + tablouri colectoare AC",   null, 4,    null, "invertoare"),

  // ── Section V: CONEXIUNI INVERTOARE & TEC ───────────────────────────
  row("V",   19, "CONEXIUNI INVERTOARE & TEC",                   null, null, null, "conexiuni"),
  row("5.1", 20, "Conexiuni AC invertoare",                      null, 6,    null, "conexiuni"),
  row("5.2", 21, "Conexiuni tablouri electrice AC",              null, 7,    null, "conexiuni"),
  row("5.3", 22, "Conexiuni TDRI - PTAB",                        null, 3,    null, "conexiuni"),

  // ── Section VI: POST DE TRANSFORMARE ────────────────────────────────
  row("VI",  23, "POST DE TRANSFORMARE",                         null, null, null, "post_transformare"),
  row("6.1", 24, "Fundație post trafo",                          null, 3,    null, "post_transformare"),
  row("6.2", 25, "Amplasare posturi trafo + macara",             null, 2,    null, "post_transformare"),
  row("6.3", 26, "Amplasare transformatoare + macara",           null, 2,    null, "post_transformare"),
  row("6.4", 27, "Cablare posturi trafo",                        null, 4,    null, "post_transformare"),

  // ── Section VII: VERIFICĂRI ÎNAINTEA RECEPȚIEI ──────────────────────
  row("VII", 28, "VERIFICĂRI ÎNAINTEA RECEPȚIEI",                null, null, null, "verificari"),
  row("7.1", 29, "Verificări electrice + măsurători + probe",    null, 3,    null, "verificari"),

  // ── Section VIII: MONTAJ BESS ────────────────────────────────────────
  row("VIII",30, "MONTAJ BESS",                                  null, null, null, "montaj_bess"),
  row("8.1", 31, "Împrejmuire BESS",                             null, 3,    null, "montaj_bess"),
  row("8.2", 32, "Iluminat BESS",                                null, 2,    null, "montaj_bess"),
  row("8.3", 33, "Sistem de camere BESS",                        null, 2,    null, "montaj_bess"),
  row("8.4", 34, "Fundație BESS",                                null, 5,    null, "montaj_bess"),
  row("8.5", 35, "Închiriere macara + amplasare BESS",           null, 1,    null, "montaj_bess"),
  row("8.6", 36, "Cablare BESS",                                 null, 4,    null, "montaj_bess"),
  row("8.7", 37, "Racord BESS",                                  null, 2,    null, "montaj_bess"),

  // ── Section III (BESS): MONTAJ ───────────────────────────────────────
  row("III", 38, "MONTAJ",                                       null, null, null, "conectare_bess"),
  row("3.1", 39, "...",                                          null, 2,    null, "conectare_bess"),
  row("3.2", 40, "Cablare interioară BESS",                      null, 4,    null, "conectare_bess"),

  // ── Section IV (BESS): CONECTARE ────────────────────────────────────
  row("IV",  41, "CONECTARE",                                    null, null, null, "conectare_bess"),
  row("4.1", 42, "Racord BESS la rețea",                         null, 2,    null, "conectare_bess"),
  row("4.2", 43, "Conexiuni date / SCADA",                       null, 2,    null, "conectare_bess"),

  // ── Section V (BESS): VERIFICĂRI ────────────────────────────────────
  row("V",   44, "VERIFICĂRI",                                   null, null, null, "verificari_bess"),
  row("5.1", 45, "Verificări electrice + probe",                 null, 3,    null, "verificari_bess"),

  // ── Section I (PREGĂTIRE TEREN) ──────────────────────────────────────
  row("I",   46, "PREGĂTIRE TEREN",                              null, null, null, "montaj_bess"),
  row("1.1", 47, "Împrejmuire BESS",                             null, 3,    null, "montaj_bess"),
  row("1.2", 48, "Iluminat",                                     null, 2,    null, "montaj_bess"),
  row("1.3", 49, "Sistem de camere",                             null, 2,    null, "montaj_bess"),

  // ── Section II (CONSTRUCȚII) ─────────────────────────────────────────
  row("II",  50, "CONSTRUCȚII",                                  null, null, null, "montaj_bess"),
  row("2.1", 51, "Fundație BESS",                                null, 5,    null, "montaj_bess"),

  // ── Section III (MONTAJ containere) ─────────────────────────────────
  row("III", 52, "MONTAJ",                                       null, null, null, "montaj_bess"),
  row("3.1", 53, "Închiriere macara + amplasare containere BESS",null, 2,    null, "montaj_bess"),
  row("3.2", 54, "Cablare interioară BESS",                      null, 4,    null, "montaj_bess"),

  // ── Section IV (CONECTARE) ───────────────────────────────────────────
  row("IV",  55, "CONECTARE",                                    null, null, null, "conectare_bess"),
  row("4.1", 56, "Racord BESS la rețea",                         null, 2,    null, "conectare_bess"),
  row("4.2", 57, "Conexiuni date / SCADA",                       null, 2,    null, "conectare_bess"),

  // ── Section V (VERIFICĂRI) ───────────────────────────────────────────
  row("V",   58, "VERIFICĂRI",                                   null, null, null, "verificari_bess"),
  row("5.1", 59, "Verificări electrice + probe",                 null, 3,    null, "verificari_bess"),

  // ── Section I (STRUCTURA 2) ──────────────────────────────────────────
  row("I",   60, "STRUCTURA",                                    null, null, null, "structura"),
  row("1.1", 61, "Împrejmuire stâlpi",                           null, 5,    null, "structura"),
  row("1.2", 62, "Împrejmuire panou bordurat",                   null, 5,    null, "structura"),
  row("1.3", 63, "Batere stâlpi",                                null, 12,   null, "structura"),
  row("1.4", 64, "Montaj grinzi longitudinale",                  null, 6,    null, "structura"),
  row("1.5", 65, "Montaj grinzi verticale",                      null, 6,    null, "structura"),

  // ── Section II (MONTAJ PANOURI 2) ───────────────────────────────────
  row("II",  66, "MONTAJ PANOURI",                               null, null, null, "montaj_panouri"),
  row("2.1", 67, "Montaj panouri",                               null, 8,    null, "montaj_panouri"),
  row("2.2", 68, "Montaj jgheab metalic / trasee cabluri",       null, 6,    null, "montaj_panouri"),
  row("2.3", 69, "Realizare cablaj stringuri",                   null, 6,    null, "montaj_panouri"),

  // ── Section III (CABLAJ AC 2) ────────────────────────────────────────
  row("III", 70, "CABLAJ AC + ÎMPĂMÂNTARE",                      null, null, null, "cablaj_ac"),
  row("3.1", 71, "Săpături trasee cabluri AC",                   null, 10,   null, "cablaj_ac"),
  row("3.2", 72, "Realizare împământare (țăruși + platbandă)",   null, 4,    null, "cablaj_ac"),
  row("3.3", 73, "Pozare cabluri AC (forță + iluminat)",         null, 4,    null, "cablaj_ac"),
  row("3.4", 74, "Fundații + plantare stâlpi iluminat",          null, 3,    null, "cablaj_ac"),
  row("3.5", 75, "Piese separație + împământare mese",           null, 2,    null, "cablaj_ac"),

  // ── Section IV (INVERTOARE 2) ───────────────────────────────────────
  row("IV",  76, "INVERTOARE & TABLOURI",                        null, null, null, "invertoare"),
  row("4.1", 77, "Montaj invertoare + tablouri colectoare AC",   null, 4,    null, "invertoare"),

  // ── Section V (CONEXIUNI 2) ──────────────────────────────────────────
  row("V",   78, "CONEXIUNI INVERTOARE & TEC",                   null, null, null, "conexiuni"),
  row("5.1", 79, "Conexiuni AC invertoare",                      null, 6,    null, "conexiuni"),
  row("5.2", 80, "Conexiuni tablouri electrice AC",              null, 7,    null, "conexiuni"),
  row("5.3", 81, "Conexiuni TDRI - PTAB",                        null, 3,    null, "conexiuni"),

  // ── Section VI (POST TRAFO 2) ────────────────────────────────────────
  row("VI",  82, "POST DE TRANSFORMARE",                         null, null, null, "post_transformare"),
  row("6.1", 83, "Fundație post trafo",                          null, 3,    null, "post_transformare"),
  row("6.2", 84, "Amplasare posturi trafo + macara",             null, 2,    null, "post_transformare"),
  row("6.3", 85, "Amplasare transformatoare + macara",           null, 2,    null, "post_transformare"),
  row("6.4", 86, "Cablare posturi trafo",                        null, 4,    null, "post_transformare"),

  // ── Section VII (VERIFICĂRI 2) ──────────────────────────────────────
  row("VII", 87, "VERIFICĂRI ÎNAINTEA RECEPȚIEI",                null, null, null, "verificari"),
  row("7.1", 88, "Verificări electrice + măsurători + probe",    null, 3,    null, "verificari"),

  // ── Section I (STRUCTURA 3) ──────────────────────────────────────────
  row("I",   89, "STRUCTURA",                                    null, null, null, "structura"),
  row("1.1", 90, "Împrejmuire stâlpi",                           null, 5,    null, "structura"),
  row("1.2", 91, "Împrejmuire panou bordurat",                   null, 5,    null, "structura"),
  row("1.3", 92, "Batere stâlpi",                                null, 12,   null, "structura"),
  row("1.4", 93, "Montaj grinzi longitudinale",                  null, 6,    null, "structura"),
  row("1.5", 94, "Montaj grinzi verticale",                      null, 6,    null, "structura"),

  // ── Section II (MONTAJ PANOURI 3) ───────────────────────────────────
  row("II",  95, "MONTAJ PANOURI",                               null, null, null, "montaj_panouri"),
  row("2.1", 96, "Montaj panouri",                               null, 8,    null, "montaj_panouri"),
  row("2.2", 97, "Montaj jgheab metalic / trasee cabluri",       null, 6,    null, "montaj_panouri"),
  row("2.3", 98, "Realizare cablaj stringuri",                   null, 6,    null, "montaj_panouri"),

  // ── Section III (CABLAJ AC 3) ────────────────────────────────────────
  row("III", 99, "CABLAJ AC + ÎMPĂMÂNTARE",                      null, null, null, "cablaj_ac"),
  row("3.1",100, "Săpături trasee cabluri AC",                   null, 10,   null, "cablaj_ac"),
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
