import type { MaintenanceCheck, MaintenancePeriod } from "../types";

export interface SetMaintenanceCheckPayload {
  projectId: number;
  year: number;
  period: MaintenancePeriod;
  checked: boolean;
  checkedBy: string | null;
}

export interface MaintenanceApiClient {
  getMaintenanceChecks(projectId: number): Promise<MaintenanceCheck[]>;
  setMaintenanceCheck(payload: SetMaintenanceCheckPayload): Promise<void>;
}
