import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubcontractorsApiClient, CreateSubcontractorPayload, UpsertAssignmentPayload } from "./types";
import type {
  Subcontractor,
  SubcontractorRef,
  SubcontractorWithProjects,
  ProjectSubcontractorAssignment,
} from "../types";

const ASSIGNMENTS_SELECT =
  "assignments:project_subcontractors(id, price_eur, price_lei, start_date, deadline, is_current, project:projects(id, name, current_phase))";

export const createSupabaseSubcontractorsClient = (supabase: SupabaseClient): SubcontractorsApiClient => ({
  async getSubcontractors() {
    const { data, error } = await supabase
      .from("subcontractors")
      .select(`*, ${ASSIGNMENTS_SELECT}`)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SubcontractorWithProjects[];
  },

  async getSubcontractorRefs() {
    const { data, error } = await supabase
      .from("subcontractors")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as SubcontractorRef[];
  },

  async getSubcontractorById(id) {
    const { data, error } = await supabase
      .from("subcontractors")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Subcontractor | null;
  },

  async createSubcontractor(payload: CreateSubcontractorPayload) {
    const { data, error } = await supabase
      .from("subcontractors")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateSubcontractor(id, payload: CreateSubcontractorPayload) {
    const { error } = await supabase
      .from("subcontractors")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteSubcontractor(id) {
    const { error } = await supabase.from("subcontractors").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") throw new Error("HasProjectHistory");
      throw new Error(error.message);
    }
  },

  async getCurrentAssignment(projectId) {
    const { data, error } = await supabase
      .from("project_subcontractors")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as ProjectSubcontractorAssignment | null;
  },

  async upsertCurrentAssignment(projectId, payload: UpsertAssignmentPayload) {
    const { error: deactivateError } = await supabase
      .from("project_subcontractors")
      .update({ is_current: false })
      .eq("project_id", projectId)
      .eq("is_current", true);
    if (deactivateError) throw new Error(deactivateError.message);

    const { error: insertError } = await supabase
      .from("project_subcontractors")
      .insert({ project_id: projectId, ...payload, is_current: true });
    if (insertError) throw new Error(insertError.message);
  },
});
