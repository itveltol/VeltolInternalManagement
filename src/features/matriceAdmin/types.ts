import type { Activity, ActivityDependency, MatricePhase } from "@/features/matrice/types";

export type { Activity, ActivityDependency, MatricePhase };

export interface PhaseWithActivities extends MatricePhase {
  activities: Activity[];
}

export interface MatriceCatalog {
  phases: PhaseWithActivities[];
  dependencies: ActivityDependency[];
}
