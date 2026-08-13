import type { ProjectBilling, Currency } from "../types";

export interface UpsertBillingPayload {
  invoiced_net: number;
  collected_net: number;
  currency: Currency;
  conversion_rate: number | null;
  notes: string | null;
}

export interface BillingApiClient {
  getAllBilling(): Promise<ProjectBilling[]>;
  getBillingForProject(projectId: number): Promise<ProjectBilling | null>;
  upsertBilling(projectId: number, payload: UpsertBillingPayload, updatedBy: string | null): Promise<void>;
}
