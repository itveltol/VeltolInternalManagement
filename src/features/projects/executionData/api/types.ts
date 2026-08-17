import type { ProjectExecutionData, ProjectStructureConfigRow } from "@/features/projects/executionData/types";

export interface UpsertExecutionDataPayload {
  projectId: number;
  site_responsible: string | null;
  diriginte_santier: string | null;
  rte: string | null;
  buget_alocat_eur: number | null;
  numar_persoane_alocate: number | null;
  zile_deadline: number | null;
  zile_reale: number | null;
  updatedBy: string;
}

export interface UpsertStructureConfigRowPayload {
  id?: number;
  projectId: number;
  structure_type: string;
  mesa_count: number;
  picior_per_mesa: number | null;
  stalp_per_mesa: number | null;
  grinzi_per_mesa: number | null;
  pane_per_mesa: number | null;
  sort_order: number;
}

export interface ExecutionDataApiClient {
  getExecutionData(projectId: number): Promise<ProjectExecutionData | null>;
  upsertExecutionData(payload: UpsertExecutionDataPayload): Promise<void>;
  getStructureConfig(projectId: number): Promise<ProjectStructureConfigRow[]>;
  upsertStructureConfigRow(payload: UpsertStructureConfigRowPayload): Promise<void>;
  deleteStructureConfigRow(id: number): Promise<void>;
}
