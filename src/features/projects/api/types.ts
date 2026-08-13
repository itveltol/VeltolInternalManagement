import type { Project, ProjectManager, ProjectCategory, ProjectPhase, ContractType, FinancialType, ExecutionMode, Currency } from "../types";

export interface CreateProjectPayload {
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
  client_id: number | null;
  execution_mode: ExecutionMode;
  current_phase: string;
  progress_pct: number;
  contract_number: string | null;
  contract_date: string | null;
  deadline: string | null;
  value_eur: number | null;
  value_lei: number | null;
  currency: Currency;
  /** EUR->RON rate to lock in when this project is first created; ignored on update — see ProjectsApiClient.updateProject. */
  conversion_rate: number | null;
  status: string;
  status_manual: boolean;
  notes: string | null;
  paid_by: string | null;
}

export interface UpdatePhaseDatesPayload {
  start_date: string | null;
  end_date: string | null;
}

export interface ProjectListFilters {
  phase?: ProjectPhase[];
  category?: ProjectCategory | null;
  contractType?: ContractType[];
  minValue?: number | null;
  maxValue?: number | null;
}

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  filters?: ProjectListFilters;
  sortByValue?: "asc" | "desc" | null;
}

export interface ProjectListResult {
  projects: Project[];
  totalCount: number;
}

export interface ProjectsApiClient {
  getProjects(params?: ProjectListParams): Promise<ProjectListResult>;
  getProjectById(id: number): Promise<Project | null>;
  getProjectManagers(): Promise<ProjectManager[]>;
  createProject(payload: CreateProjectPayload, userId: string): Promise<{ id: number }>;
  updateProject(id: number, payload: CreateProjectPayload, userId: string): Promise<void>;
  updateProjectTeam(id: number, teamId: number | null, userId: string): Promise<void>;
  deleteProject(id: number): Promise<void>;
  linkOneDriveFolder(id: number, folderId: string, folderUrl: string, userId: string): Promise<void>;
  updatePhaseDates(
    id: number,
    phaseKey: "planning" | "execution" | "autorizare",
    dates: UpdatePhaseDatesPayload,
    userId: string,
  ): Promise<void>;
}
