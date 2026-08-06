export type Currency = "EUR" | "RON";

export interface CostCategory {
  id: number;
  code: string;
  name_ro: string;
  name_hu: string;
  name_en: string;
  sort_order: number;
}

export interface ProjectBudgetLine {
  id: number;
  project_id: number;
  cost_category_id: number;
  cost_category?: CostCategory | null;
  phase_no: number | null;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  currency: Currency;
  /** EUR->RON rate pinned at insert; never recomputed against a later rate. */
  conversion_rate: number | null;
  amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** One cost category's budget lines plus their EUR-normalized subtotal, for
 * the deviz table grouped by category. */
export interface BudgetLinesByCategory {
  category: CostCategory;
  lines: ProjectBudgetLine[];
  totalEur: number;
}

/** Read-only margin skeleton for the Financiar tab header KPIs — see
 * PLAN-modul-financiar.md section 2. Angajat/Realizat/AR are wired in a
 * later phase; they stay null here so the UI can render them as placeholders
 * without the shape changing later. */
export interface ProjectMarginSummary {
  contractValueEur: number | null;
  budgetEur: number;
  marginBudgetedEur: number | null;
  marginBudgetedPct: number | null;
  isBelowThreshold: boolean;
  committedEur: null;
  actualEur: null;
  receivableEur: null;
}
