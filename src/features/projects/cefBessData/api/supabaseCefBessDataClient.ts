import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CefBessDataApiClient,
  UpsertCefDataPayload,
  UpsertBessDataPayload,
} from "./types";
import type { ProjectCefData, ProjectBessData } from "@/features/projects/cefBessData/types";

export const createSupabaseCefBessDataClient = (supabase: SupabaseClient): CefBessDataApiClient => ({
  async getCefData(projectId) {
    const { data, error } = await supabase
      .from("project_cef_data")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as ProjectCefData | null;
  },

  async upsertCefData({
    projectId, putere_instalata, putere_debitata, tip_panou, tip_invertor, tip_structura, tip_gard, ridicare_topo, updatedBy,
  }: UpsertCefDataPayload) {
    const { error } = await supabase
      .from("project_cef_data")
      .upsert(
        {
          project_id: projectId, putere_instalata, putere_debitata,
          tip_panou, tip_invertor, tip_structura, tip_gard, ridicare_topo,
          updated_by: updatedBy,
        },
        { onConflict: "project_id" }
      );
    if (error) throw new Error(error.message);
  },

  async getBessData(projectId) {
    const { data, error } = await supabase
      .from("project_bess_data")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as ProjectBessData | null;
  },

  async upsertBessData({
    projectId, putere_instalata, putere_descarcare, incarcare_din_retea, tip_bess, tip_pcs, ridicare_topo, detalii_trafo, updatedBy,
  }: UpsertBessDataPayload) {
    const { error } = await supabase
      .from("project_bess_data")
      .upsert(
        {
          project_id: projectId, putere_instalata, putere_descarcare, incarcare_din_retea,
          tip_bess, tip_pcs, ridicare_topo, detalii_trafo,
          updated_by: updatedBy,
        },
        { onConflict: "project_id" }
      );
    if (error) throw new Error(error.message);
  },
});
