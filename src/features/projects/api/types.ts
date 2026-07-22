import type { Project, ProjectManager, ProjectCategory, ContractType, FinancialType } from "../types";

export interface CreateProjectPayload {
  name: string;
  county: string | null;
  site_location: string | null;
  mw_solar: number | null;
  mw_bess: number | null;
  project_category: ProjectCategory;
  financial_type: FinancialType;
  project_type: string | null;
  contract_type: ContractType[];
  manager_id: string | null;
  client_id: number | null;
  current_phase: string;
  progress_pct: number;
  contract_number: string | null;
  contract_date: string | null;
  deadline: string | null;
  value_eur: number | null;
  value_eur_solar: number | null;
  value_eur_bess: number | null;
  status: string;
  status_manual: boolean;
  priority: string;
  progress_pct_manual: boolean;
  cu_issued: boolean;
  atr_issued: boolean;
  notes: string | null;
  paid_by: string | null;
}

export interface UpdatePhaseDatesPayload {
  start_date: string | null;
  end_date: string | null;
}

export interface ProjectsApiClient {
  getProjects(): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | null>;
  getProjectManagers(): Promise<ProjectManager[]>;
  createProject(payload: CreateProjectPayload): Promise<{ id: number }>;
  updateProject(id: number, payload: CreateProjectPayload): Promise<void>;
  updateProjectTeam(id: number, teamId: number | null): Promise<void>;
  deleteProject(id: number): Promise<void>;
  linkOneDriveFolder(id: number, folderId: string, folderUrl: string): Promise<void>;
  updatePhaseDates(
    id: number,
    phaseKey: "planning" | "execution" | "autorizare",
    dates: UpdatePhaseDatesPayload,
  ): Promise<void>;
}
