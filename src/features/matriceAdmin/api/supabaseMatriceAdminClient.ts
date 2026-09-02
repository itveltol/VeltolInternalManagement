import type { SupabaseClient } from "@supabase/supabase-js";
import { DependencyCycleError, type MatriceAdminApiClient } from "./types";
import type { Activity, ActivityDependency, MatricePhase } from "@/features/matrice/types";

export const createSupabaseMatriceAdminClient = (supabase: SupabaseClient): MatriceAdminApiClient => ({
  async getPhases() {
    const { data, error } = await supabase.from("matrice_phases").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as MatricePhase[];
  },

  async getActivities() {
    const { data, error } = await supabase.from("activities").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as Activity[];
  },

  async getDependencies() {
    const { data, error } = await supabase.from("matrice_activity_dependencies").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityDependency[];
  },

  async getChecklistLinkedActivityIds() {
    const { data, error } = await supabase.from("checklist_activity_map").select("activity_id");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.activity_id as number);
  },

  async createPhase(payload) {
    const { data, error } = await supabase.from("matrice_phases").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return data as MatricePhase;
  },

  async renamePhase(id, name) {
    const { error } = await supabase.from("matrice_phases").update({ name }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updatePhaseSortOrder(id, sortOrder) {
    const { error } = await supabase.from("matrice_phases").update({ sort_order: sortOrder }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updatePhaseGating(id, serviceType, ganttPhaseKey) {
    const { error } = await supabase
      .from("matrice_phases")
      .update({ service_type: serviceType, gantt_phase_key: ganttPhaseKey })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deletePhase(id) {
    const { error } = await supabase.from("matrice_phases").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async createActivity(payload) {
    const { data, error } = await supabase.from("activities").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return data as Activity;
  },

  async renameActivity(id, name) {
    const { error } = await supabase.from("activities").update({ name }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updateActivitySortOrder(id, sortOrder) {
    const { error } = await supabase.from("activities").update({ sort_order: sortOrder }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async moveActivityToPhase(id, phaseId, sortOrder) {
    const { error } = await supabase
      .from("activities")
      .update({ phase_id: phaseId, sort_order: sortOrder })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async setActivityExpiresRequired(id, expiresRequired) {
    const { error } = await supabase
      .from("activities")
      .update({ expires_required: expiresRequired })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async setActivityIsAviz(id, isAviz) {
    const { error } = await supabase
      .from("activities")
      .update(isAviz ? { is_aviz: true, expires_required: true } : { is_aviz: false })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteActivity(id) {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async addDependency(activityId, dependsOnActivityId) {
    const { error } = await supabase
      .from("matrice_activity_dependencies")
      .insert({ activity_id: activityId, depends_on_activity_id: dependsOnActivityId });
    if (error) {
      if (error.hint === "dependency_cycle") throw new DependencyCycleError(error.message);
      throw new Error(error.message);
    }
  },

  async removeDependency(activityId, dependsOnActivityId) {
    const { error } = await supabase
      .from("matrice_activity_dependencies")
      .delete()
      .eq("activity_id", activityId)
      .eq("depends_on_activity_id", dependsOnActivityId);
    if (error) throw new Error(error.message);
  },
});
