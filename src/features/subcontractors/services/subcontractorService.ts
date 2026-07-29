import type { SubcontractorsApiClient, CreateSubcontractorPayload } from "../api/types";
import type { Subcontractor, SubcontractorRef } from "../types";

export async function getSubcontractors(api: SubcontractorsApiClient): Promise<Subcontractor[]> {
  return api.getSubcontractors();
}

export async function getSubcontractorRefs(api: SubcontractorsApiClient): Promise<SubcontractorRef[]> {
  return api.getSubcontractorRefs();
}

export async function getSubcontractorById(api: SubcontractorsApiClient, id: number): Promise<Subcontractor | null> {
  return api.getSubcontractorById(id);
}

export async function createSubcontractor(api: SubcontractorsApiClient, payload: CreateSubcontractorPayload): Promise<{ id: number }> {
  return api.createSubcontractor(payload);
}

export async function updateSubcontractor(api: SubcontractorsApiClient, id: number, payload: CreateSubcontractorPayload): Promise<void> {
  return api.updateSubcontractor(id, payload);
}

export async function deleteSubcontractor(api: SubcontractorsApiClient, id: number): Promise<void> {
  return api.deleteSubcontractor(id);
}
