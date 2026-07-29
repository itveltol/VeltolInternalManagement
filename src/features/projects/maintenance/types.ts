export type MaintenancePeriod = "march" | "october";

export interface MaintenanceCheck {
  id: number;
  project_id: number;
  year: number;
  period: MaintenancePeriod;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
}

export type MaintenanceState = "needsAttention" | "done" | "notDue";

export interface MaintenanceCycle {
  year: number;
  period: MaintenancePeriod;
  check: MaintenanceCheck | null;
  state: MaintenanceState;
}

export const MAINTENANCE_PERIODS: MaintenancePeriod[] = ["march", "october"];
