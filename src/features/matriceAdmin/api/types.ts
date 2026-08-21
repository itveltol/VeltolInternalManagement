import type { Activity, ActivityDependency, MatricePhase } from "@/features/matrice/types";
import type { ContractType } from "@/features/projects/types";
import type { GanttPhaseKey } from "@/features/gantt/types";

export interface CreatePhasePayload {
  name: string;
  sort_order: number;
  service_type: ContractType;
  gantt_phase_key: GanttPhaseKey | null;
}

export interface CreateActivityPayload {
  phase_id: number;
  name: string;
  sort_order: number;
  is_section_header: boolean;
}

export interface MatriceAdminApiClient {
  getPhases(): Promise<MatricePhase[]>;
  getActivities(): Promise<Activity[]>;
  getDependencies(): Promise<ActivityDependency[]>;
  getChecklistLinkedActivityIds(): Promise<number[]>;

  createPhase(payload: CreatePhasePayload): Promise<MatricePhase>;
  renamePhase(id: number, name: string): Promise<void>;
  updatePhaseSortOrder(id: number, sortOrder: number): Promise<void>;
  updatePhaseGating(id: number, serviceType: ContractType, ganttPhaseKey: GanttPhaseKey | null): Promise<void>;
  deletePhase(id: number): Promise<void>;

  createActivity(payload: CreateActivityPayload): Promise<Activity>;
  renameActivity(id: number, name: string): Promise<void>;
  updateActivitySortOrder(id: number, sortOrder: number): Promise<void>;
  moveActivityToPhase(id: number, phaseId: number, sortOrder: number): Promise<void>;
  setActivityExpiresRequired(id: number, expiresRequired: boolean): Promise<void>;
  deleteActivity(id: number): Promise<void>;

  addDependency(activityId: number, dependsOnActivityId: number): Promise<void>;
  removeDependency(activityId: number, dependsOnActivityId: number): Promise<void>;
}

/** Thrown when the DB's cycle-prevention trigger rejects a new dependency edge. */
export class DependencyCycleError extends Error {}
