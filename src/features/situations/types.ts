export type SituationStatus = "draft" | "final";

export type Currency = "EUR" | "RON";

export interface Situation {
  id: number;
  project_id: number;
  name: string;
  status: SituationStatus;
  pct_snapshot: number | null;
  amount_eur_snapshot: number | null;
  amount_lei_snapshot: number | null;
  /** EUR->RON rate locked in at finalize time; null while draft. */
  conversion_rate: number | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The project fields needed by the centralizer/situation figures, joined
 * onto situations/billing rows to avoid a second round trip. */
export interface SituationProjectRef {
  id: number;
  name: string;
  value_eur: number | null;
  value_lei: number | null;
  /** Which of value_eur/value_lei is the project's actual source amount. */
  currency: Currency;
  /** EUR->RON rate locked in when the project was created. */
  conversion_rate: number | null;
  progress_pct: number;
  contract_number: string | null;
  contract_date: string | null;
  current_phase: string;
  /** Percent VAT applied to gross up every net figure for display. */
  vat_rate: number;
  client: { id: number; name: string } | null;
}

/**
 * A situation joined with enough of its project to render/compute without a
 * second round trip — used by the global list and detail views.
 */
export interface SituationWithProject extends Situation {
  project: SituationProjectRef;
}

/** The live-or-frozen numbers actually displayed for one situation. */
export interface SituationFigures {
  pct: number | null;
  amountEur: number | null;
  amountLei: number | null;
}

/**
 * The two manually-maintained centralizer figures for one contract
 * (Facturat/Încasat, the yellow cells of the Excel centralizer) plus the
 * currency/rate they were entered in. Net — VAT is applied only for display,
 * see grossOf() in centralizerService.ts. A project with no figures entered
 * yet has no row in project_billing at all; callers treat that as 0/0
 * (see centralizerService.buildCentralizerRows).
 */
export interface ProjectBilling {
  id: number;
  project_id: number;
  invoiced_net: number;
  collected_net: number;
  currency: Currency;
  conversion_rate: number | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Per-currency money figures for one contract centralizer row — each pairs
 * the net source value with its VAT-grossed display value so components
 * never recompute VAT inline. */
export interface CentralizerMoney {
  net: number;
  gross: number;
}

/** One row of the Situații → Centralizator contracte table: one project
 * (= one contract, see the migration comment on project_billing) with every
 * money figure the Excel centralizer tracks, in both currencies. */
export interface CentralizerRow {
  projectId: number;
  contractNumber: string | null;
  contractDate: string | null;
  projectName: string;
  beneficiar: string | null;
  currentPhase: string;
  vatRate: number;
  eur: {
    contractValue: CentralizerMoney;
    executed: CentralizerMoney;
    invoiced: CentralizerMoney;
    collected: CentralizerMoney;
    remainingToExecute: number;
    remainingToInvoice: number;
    remainingToCollect: number;
  };
  lei: {
    contractValue: CentralizerMoney;
    executed: CentralizerMoney;
    invoiced: CentralizerMoney;
    collected: CentralizerMoney;
    remainingToExecute: number;
    remainingToInvoice: number;
    remainingToCollect: number;
  };
}
