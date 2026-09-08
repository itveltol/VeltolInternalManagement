import type { ProjectCategory, ContractType } from "@/features/projects/types";

export type SituationStatus = "draft" | "final" | "paid";

export type Currency = "EUR" | "RON";

export interface Situation {
  id: number;
  project_id: number;
  contract_id: number;
  name: string;
  status: SituationStatus;
  pct_snapshot: number | null;
  amount_eur_snapshot: number | null;
  amount_lei_snapshot: number | null;
  /** EUR->RON rate locked in at finalize time; null while draft. */
  conversion_rate: number | null;
  finalized_at: string | null;
  /** When this situation was marked paid; null until then. Only ever set on a situation that's already final. */
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The project fields needed by the centralizer/situation figures — the
 * parts that stay project-level even once a project has several contracts
 * (name, category, current phase, client). Joined onto situations/contract
 * rows to avoid a second round trip. */
export interface SituationProjectRef {
  id: number;
  name: string;
  project_category: ProjectCategory;
  current_phase: string;
  client: { id: number; name: string } | null;
}

/** The contract fields needed by the centralizer/situation figures — one
 * situation bills against exactly one contract's value/currency/vat_rate
 * (see situations.contract_id, supabase/migrations/
 * 20260908000128_situations_contract_id.sql), not "the project's" (now
 * ambiguous, since a project can have several) contract facts. */
export interface SituationContractRef {
  id: number;
  project_id: number;
  value_eur: number | null;
  value_lei: number | null;
  /** Which of value_eur/value_lei is the contract's actual source amount. */
  currency: Currency;
  /** EUR->RON rate locked in when the contract was created. */
  conversion_rate: number | null;
  contract_number: string | null;
  contract_date: string | null;
  contract_type: ContractType[];
  /** Percent VAT applied to gross up every net figure for display. */
  vat_rate: number;
  /** This contract's own completion %, computed by filtering the project's
   * one Matrice down to this contract's contract_type[] (see
   * contract_progress_pct() in supabase/migrations/
   * 20260908000128_situations_contract_id.sql) — NOT the project's blended
   * progress_pct. Fetched alongside the contract row rather than stored. */
  progress_pct: number;
  project: SituationProjectRef;
}

/**
 * A situation joined with enough of its contract (and that contract's
 * project) to render/compute without a second round trip — used by the
 * global list and detail views.
 */
export interface SituationWithProject extends Situation {
  contract: SituationContractRef;
}

/** The live-or-frozen numbers actually displayed for one situation. */
export interface SituationFigures {
  pct: number | null;
  amountEur: number | null;
  amountLei: number | null;
}

/** Per-currency money figures for one contract centralizer row — each pairs
 * the net source value with its VAT-grossed display value so components
 * never recompute VAT inline. */
export interface CentralizerMoney {
  net: number;
  gross: number;
}

/** One row of the Situații → Centralizator contracte table: one CONTRACT
 * (a project can now have several — see contracts table,
 * supabase/migrations/20260908000127_create_contracts.sql) with every money
 * figure the Excel centralizer tracks, in both currencies. */
export interface CentralizerRow {
  contractId: number;
  projectId: number;
  projectCategory: ProjectCategory;
  contractNumber: string | null;
  contractDate: string | null;
  contractTypes: ContractType[];
  projectName: string;
  beneficiar: string | null;
  currentPhase: string;
  vatRate: number;
  eur: {
    contractValue: CentralizerMoney;
    // null for residential contracts: there's no Matrice tracking their
    // build-out, so progress_pct-based "executed" would just be a permanent,
    // misleading 0 — the UI renders "—" instead.
    executed: CentralizerMoney | null;
    invoiced: CentralizerMoney;
    collected: CentralizerMoney;
    remainingToExecute: number | null;
    remainingToInvoice: number;
    remainingToCollect: number;
  };
  lei: {
    contractValue: CentralizerMoney;
    executed: CentralizerMoney | null;
    invoiced: CentralizerMoney;
    collected: CentralizerMoney;
    remainingToExecute: number | null;
    remainingToInvoice: number;
    remainingToCollect: number;
  };
}
