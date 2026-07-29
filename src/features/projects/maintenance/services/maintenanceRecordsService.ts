import type { MaintenanceApiClient, SetMaintenanceCheckPayload } from "../api/types";
import type { MaintenanceCheck } from "../types";

export async function getMaintenanceChecks(
  client: MaintenanceApiClient,
  projectId: number
): Promise<MaintenanceCheck[]> {
  return client.getMaintenanceChecks(projectId);
}

export async function setMaintenanceCheck(
  client: MaintenanceApiClient,
  payload: SetMaintenanceCheckPayload
): Promise<void> {
  return client.setMaintenanceCheck(payload);
}
