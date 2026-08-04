import type { Situation, SituationWithProject } from "../types";

export interface CreateSituationPayload {
  projectId: number;
  name: string;
}

export interface UpdateSituationPayload {
  name: string;
}

export interface FinalizeSituationPayload {
  pct: number | null;
  amountEur: number | null;
  amountLei: number | null;
  conversionRate: number | null;
}

export interface SituationsApiClient {
  getAllSituationsWithProjects(): Promise<SituationWithProject[]>;
  getSituationsForProject(projectId: number): Promise<Situation[]>;
  createSituation(payload: CreateSituationPayload): Promise<{ id: number }>;
  updateSituation(situationId: number, payload: UpdateSituationPayload): Promise<void>;
  deleteSituation(situationId: number): Promise<void>;
  finalizeSituation(situationId: number, payload: FinalizeSituationPayload): Promise<void>;
}
