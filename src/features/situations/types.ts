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

/**
 * A situation joined with enough of its project to render/compute without a
 * second round trip — used by the global list and detail views.
 */
export interface SituationWithProject extends Situation {
  project: {
    id: number;
    name: string;
    value_eur: number | null;
    value_lei: number | null;
    /** Which of value_eur/value_lei is the project's actual source amount. */
    currency: Currency;
    /** EUR->RON rate locked in when the project was created. */
    conversion_rate: number | null;
    progress_pct: number;
  };
}

/** The live-or-frozen numbers actually displayed for one situation. */
export interface SituationFigures {
  pct: number | null;
  amountEur: number | null;
  amountLei: number | null;
}
