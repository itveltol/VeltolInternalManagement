export type ProjectPhase =
  | "planning"
  | "permitting"
  | "construction"
  | "warranty"
  | "closed"
  | "cancelled";

export type ProjectStatus =
  | "on_schedule"
  | "delayed"
  | "critical"
  | "completed"
  | "on_hold";

export type ProjectCategory = "residential" | "industrial";

export type FinancialType = "proprii" | "finantare";

export type ContractType = "proiectare" | "executie" | "mentenanta" | "racordare";

export type ExecutionMode = "internal" | "subcontracted";

export type Currency = "EUR" | "RON";

export interface Project {
  id: number;
  name: string;
  county: string | null;
  site_location: string | null;
  site_lat: number | null;
  site_lng: number | null;
  mw_solar: number | null;
  mw_bess: number | null;
  project_category: ProjectCategory;
  financial_type: FinancialType;
  project_type: string | null;
  contract_type: ContractType[];
  manager_id: string | null;
  manager?: { first_name: string | null; last_name: string | null } | null;
  client_id: number | null;
  client?: { id: number; name: string } | null;
  team_id: number | null;
  team?: { id: number; name: string } | null;
  execution_mode: ExecutionMode;
  /** Id of the project's current project_subcontractors assignment row, if any. */
  subcontractor_assignment_id: number | null;
  subcontractor?: {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
    price_eur: number | null;
    price_lei: number | null;
    /** Which of price_eur/price_lei was actually entered; the other is derived from conversion_rate. */
    currency: Currency;
    /** EUR->RON rate on the day this assignment was created; locked in permanently, never recomputed. */
    conversion_rate: number | null;
    start_date: string | null;
    deadline: string | null;
  } | null;
  current_phase: ProjectPhase;
  progress_pct: number;
  contract_number: string | null;
  contract_date: string | null;
  deadline: string | null;
  value_eur: number | null;
  value_lei: number | null;
  /** Which of value_eur/value_lei was actually entered; the other is derived from conversion_rate. */
  currency: Currency;
  /** EUR->RON rate on the day this project was created; locked in permanently, never recomputed. */
  conversion_rate: number | null;
  status: ProjectStatus;
  /** When false, `status` is recomputed from Matrice/checklist progress on the next relevant change. */
  status_manual: boolean;
  notes: string | null;
  paid_by: string | null;
  onedrive_folder_id: string | null;
  onedrive_folder_url: string | null;
  planning_start_date: string | null;
  planning_end_date: string | null;
  execution_start_date: string | null;
  execution_end_date: string | null;
  autorizare_start_date: string | null;
  autorizare_end_date: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_user?: { first_name: string | null; last_name: string | null } | null;
}

export interface ProjectManager {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const PROJECT_PHASES: ProjectPhase[] = [
  "planning",
  "permitting",
  "construction",
  "warranty",
  "closed",
  "cancelled",
];

export const PROJECT_STATUSES: ProjectStatus[] = [
  "on_schedule",
  "delayed",
  "critical",
  "completed",
  "on_hold",
];

export const PROJECT_CATEGORIES: ProjectCategory[] = ["residential", "industrial"];

export const FINANCIAL_TYPES: FinancialType[] = ["proprii", "finantare"];

export const CONTRACT_TYPES: ContractType[] = ["proiectare", "executie", "mentenanta", "racordare"];

export const EXECUTION_MODES: ExecutionMode[] = ["internal", "subcontracted"];

export type ProjectType =
  | "CEF"
  | "CEF+BESS"
  | "BESS"
  | "BESS_CEF"
  | "EMS"
  | "SCADA";

export const PROJECT_TYPES: ProjectType[] = [
  "CEF",
  "CEF+BESS",
  "BESS",
  "BESS_CEF",
  "EMS",
  "SCADA",
];

/** Project types that include a BESS (battery) scope of work — single
 * source of truth for BESS-conditional gating (checklist rows, Matrice
 * auto-N/A). Do not duplicate this list elsewhere. */
export const BESS_PROJECT_TYPES: ProjectType[] = ["CEF+BESS", "BESS", "BESS_CEF"];

export function isBessProjectType(type: string | null | undefined): boolean {
  return type != null && (BESS_PROJECT_TYPES as string[]).includes(type);
}
