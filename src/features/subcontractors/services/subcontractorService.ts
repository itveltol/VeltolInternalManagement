import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseSubcontractorsClient } from "../api/supabaseSubcontractorsClient";
import type { SubcontractorsApiClient, CreateSubcontractorPayload, UpsertAssignmentPayload } from "../api/types";
import type { Subcontractor, SubcontractorRef, SubcontractorWithProjects, ProjectSubcontractorAssignment } from "../types";

export async function getSubcontractors(api: SubcontractorsApiClient): Promise<SubcontractorWithProjects[]> {
  return api.getSubcontractors();
}

export async function getSubcontractorRefs(api: SubcontractorsApiClient): Promise<SubcontractorRef[]> {
  return api.getSubcontractorRefs();
}

// `subcontractors` has a uniform "authenticated select" RLS policy (same rows
// for every user), so this is safe to cache globally via the admin client
// rather than per-session. Invalidated by updateTag("subcontractors") on
// create/update/delete.
export const getCachedSubcontractorRefs = unstable_cache(
  async (): Promise<SubcontractorRef[]> => {
    const api = createSupabaseSubcontractorsClient(createAdminClient());
    return api.getSubcontractorRefs();
  },
  ["subcontractor-refs"],
  { tags: ["subcontractors"] },
);

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

export async function getCurrentAssignment(api: SubcontractorsApiClient, projectId: number): Promise<ProjectSubcontractorAssignment | null> {
  return api.getCurrentAssignment(projectId);
}

export async function upsertCurrentAssignment(api: SubcontractorsApiClient, projectId: number, payload: UpsertAssignmentPayload): Promise<void> {
  return api.upsertCurrentAssignment(projectId, payload);
}
