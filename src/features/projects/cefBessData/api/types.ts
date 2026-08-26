import type { ProjectCefData, ProjectBessData } from "@/features/projects/cefBessData/types";

export interface UpsertCefDataPayload {
  projectId: number;
  putere_instalata: number | null;
  putere_debitata: number | null;
  tip_panou: string | null;
  tip_invertor: string | null;
  tip_structura: string | null;
  tip_gard: string | null;
  ridicare_topo: string | null;
  updatedBy: string;
}

export interface UpsertBessDataPayload {
  projectId: number;
  putere_instalata: number | null;
  putere_descarcare: number | null;
  incarcare_din_retea: boolean | null;
  tip_bess: string | null;
  tip_pcs: string | null;
  ridicare_topo: string | null;
  detalii_trafo: string | null;
  updatedBy: string;
}

export interface CefBessDataApiClient {
  getCefData(projectId: number): Promise<ProjectCefData | null>;
  upsertCefData(payload: UpsertCefDataPayload): Promise<void>;
  getBessData(projectId: number): Promise<ProjectBessData | null>;
  upsertBessData(payload: UpsertBessDataPayload): Promise<void>;
}
