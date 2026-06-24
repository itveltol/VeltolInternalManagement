export type ChecklistPhase =
  | "structura"
  | "montaj_panouri"
  | "cablaj_ac"
  | "invertoare"
  | "conexiuni"
  | "post_transformare"
  | "verificari"
  | "montaj_bess"
  | "pregatire_teren_bess"
  | "constructii_bess"
  | "conectare_bess"
  | "verificari_bess";

export interface ChecklistTemplateRow {
  /** Stable unique key for React — combines template prefix + number (e.g. "pv-1", "bess-1"). */
  rowKey: string;
  cod: string;
  number: number;
  activitate: string;
  plan_total: number | null;
  zile: number | null;
  target_zi: number | null;
  isSection: boolean;
  phase: ChecklistPhase;
}

export interface ChecklistItemRecord {
  id: number;
  project_id: number;
  item_number: number;
  realizat: number | null;
  plan_total: number | null;
  zile: number | null;
  target_zi: number | null;
  notes: string | null;
  updated_at: string;
}

export interface DailyLogRecord {
  id: number;
  item_id: number;
  log_date: string;
  realizat: number;
  updated_at: string;
}

export interface ChecklistRow extends ChecklistTemplateRow {
  record: ChecklistItemRecord | null;
  pct: number | null;
}

export interface SectionSummary {
  phase: ChecklistPhase;
  sectionNumber: number;
  label: string;
  totalItems: number;
  completedItems: number;
  avgPct: number;
}
