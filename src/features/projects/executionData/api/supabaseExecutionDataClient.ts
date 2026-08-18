import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExecutionDataApiClient,
  UpsertExecutionDataPayload,
  UpsertStructureConfigRowPayload,
} from "./types";
import type { ProjectExecutionData, ProjectStructureConfigRow } from "@/features/projects/executionData/types";

export const createSupabaseExecutionDataClient = (supabase: SupabaseClient): ExecutionDataApiClient => ({
  async getExecutionData(projectId) {
    const { data, error } = await supabase
      .from("project_execution_data")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as ProjectExecutionData | null;
  },

  async upsertExecutionData({
    projectId, site_responsible, diriginte_santier, rte,
    buget_alocat_eur, numar_persoane_alocate, zile_deadline, zile_reale, updatedBy,
  }: UpsertExecutionDataPayload) {
    const { error } = await supabase
      .from("project_execution_data")
      .upsert(
        {
          project_id: projectId, site_responsible, diriginte_santier, rte,
          buget_alocat_eur, numar_persoane_alocate, zile_deadline, zile_reale,
          updated_by: updatedBy,
        },
        { onConflict: "project_id" }
      );
    if (error) throw new Error(error.message);
  },

  async getStructureConfig(projectId) {
    const { data, error } = await supabase
      .from("project_structure_config")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectStructureConfigRow[];
  },

  async upsertStructureConfigRow({
    id, projectId, structure_type, mesa_count,
    picior_per_mesa, stalp_per_mesa, grinzi_per_mesa, pane_per_mesa, sort_order,
  }: UpsertStructureConfigRowPayload) {
    const row = {
      project_id: projectId, structure_type, mesa_count,
      picior_per_mesa, stalp_per_mesa, grinzi_per_mesa, pane_per_mesa, sort_order,
    };
    // `id` is a `generated always as identity` column: an `.upsert()` call
    // that includes it fails with Postgres error 428C9 ("cannot insert a
    // non-DEFAULT value into column \"id\"") because PostgREST's upsert is
    // always an INSERT ... ON CONFLICT, and inserting an explicit value into
    // a GENERATED ALWAYS identity column needs OVERRIDING SYSTEM VALUE, which
    // PostgREST doesn't set. So existing rows must go through a real UPDATE.
    if (id) {
      const { data, error } = await supabase
        .from("project_structure_config")
        .update(row)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: data.id as number };
    }
    const { data, error } = await supabase
      .from("project_structure_config")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id as number };
  },

  async deleteStructureConfigRow(id) {
    const { error } = await supabase
      .from("project_structure_config")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
});
