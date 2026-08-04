export type Currency = "EUR" | "RON";

export interface Subcontractor {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorRef {
  id: number;
  name: string;
}

export interface ProjectSubcontractorAssignment {
  id: number;
  project_id: number;
  subcontractor_id: number;
  price_eur: number | null;
  price_lei: number | null;
  /** Which of price_eur/price_lei was actually entered; the other is derived from conversion_rate. */
  currency: Currency;
  /** EUR->RON rate on the day this assignment was created; locked in permanently, never recomputed. */
  conversion_rate: number | null;
  start_date: string | null;
  deadline: string | null;
  notes: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorAssignmentProjectRef {
  id: number;
  name: string;
  current_phase: string;
}

export interface SubcontractorProjectAssignment {
  id: number;
  price_eur: number | null;
  price_lei: number | null;
  currency: Currency;
  conversion_rate: number | null;
  start_date: string | null;
  deadline: string | null;
  is_current: boolean;
  project: SubcontractorAssignmentProjectRef;
}

export interface SubcontractorWithProjects extends Subcontractor {
  assignments: SubcontractorProjectAssignment[];
}
