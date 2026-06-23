export type ProjectPhase =
  | "proposal"
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

export type ProjectPriority = "low" | "medium" | "high";

export interface Project {
  id: number;
  name: string;
  county: string | null;
  site_location: string | null;
  mw_solar: number | null;
  mw_bess: number | null;
  project_type: string | null;
  manager_id: string | null;
  manager?: { first_name: string | null; last_name: string | null } | null;
  current_phase: ProjectPhase;
  progress_pct: number;
  contract_number: string | null;
  contract_date: string | null;
  deadline: string | null;
  value_eur: number | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  cu_issued: boolean;
  atr_issued: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectManager {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export const PROJECT_PHASES: ProjectPhase[] = [
  "proposal",
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

export const PROJECT_PRIORITIES: ProjectPriority[] = ["low", "medium", "high"];
