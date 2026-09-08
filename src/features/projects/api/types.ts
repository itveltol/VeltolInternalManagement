import type { Project, ProjectManager, ProjectCategory, ProjectPhase, ContractType, FinancialType, ExecutionMode } from "../types";

export interface CreateProjectPayload {
  name: string;
  county: string | null;
  site_location: string | null;
  site_lat: number | null;
  site_lng: number | null;
  mw_solar: number | null;
  mw_bess: number | null;
  people_needed: number | null;
  project_category: ProjectCategory;
  financial_type: FinancialType;
  project_type: string | null;
  manager_id: string | null;
  sales_id: string | null;
  client_id: number | null;
  execution_mode: ExecutionMode;
  current_phase: string;
  progress_pct: number;
  deadline: string | null;
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

export interface ProjectOption {
  id: number;
  name: string;
}

export interface ProjectsApiClient {
  getProjects(params?: ProjectListParams): Promise<ProjectListResult>;
  searchProjects(query: string): Promise<ProjectOption[]>;
  getProjectById(id: number): Promise<Project | null>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  getProjectManagers(): Promise<ProjectManager[]>;
  createProject(payload: CreateProjectPayload, userId: string): Promise<{ id: number }>;
  updateProject(id: number, payload: CreateProjectPayload, userId: string): Promise<void>;
  deleteProject(id: number): Promise<void>;
  linkOneDriveFolder(id: number, folderId: string, folderUrl: string, userId: string): Promise<void>;
  updatePhaseDates(
    id: number,
    phaseKey: "planning" | "execution" | "autorizare",
    dates: UpdatePhaseDatesPayload,
    userId: string,
  ): Promise<void>;
}
