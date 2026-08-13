import type { BillingApiClient, UpsertBillingPayload } from "../api/billingTypes";
import type { ProjectBilling } from "../types";

export function getAllBilling(api: BillingApiClient): Promise<ProjectBilling[]> {
  return api.getAllBilling();
}

export function getBillingForProject(api: BillingApiClient, projectId: number): Promise<ProjectBilling | null> {
  return api.getBillingForProject(projectId);
}

export function upsertBilling(
  api: BillingApiClient,
  projectId: number,
  payload: UpsertBillingPayload,
  updatedBy: string | null,
): Promise<void> {
  return api.upsertBilling(projectId, payload, updatedBy);
}
