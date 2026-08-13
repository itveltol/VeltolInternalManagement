import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SituationsApiClient,
  CreateSituationPayload,
  UpdateSituationPayload,
  FinalizeSituationPayload,
} from "./types";
import type { Situation, SituationWithProject } from "../types";

const PROJECT_SELECT =
  "project:projects(id, name, value_eur, value_lei, currency, conversion_rate, progress_pct, contract_number, contract_date, current_phase, vat_rate, client:clients(id, name))";

export const createSupabaseSituationsClient = (supabase: SupabaseClient): SituationsApiClient => ({
  async getAllSituationsWithProjects() {
    const { data, error } = await supabase
      .from("situations")
      .select(`*, ${PROJECT_SELECT}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SituationWithProject[];
  },

  async getSituationsForProject(projectId) {
    const { data, error } = await supabase
      .from("situations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Situation[];
  },

  async getAllFinalizedSituations() {
    const { data, error } = await supabase
      .from("situations")
      .select("*")
      .eq("status", "final");
    if (error) throw new Error(error.message);
    return (data ?? []) as Situation[];
  },

  async createSituation(payload: CreateSituationPayload) {
    const { data, error } = await supabase
      .from("situations")
      .insert({ project_id: payload.projectId, name: payload.name, status: "draft" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateSituation(situationId, payload: UpdateSituationPayload) {
    const { error } = await supabase
      .from("situations")
      .update({ name: payload.name })
      .eq("id", situationId);
    if (error) throw new Error(error.message);
  },

  async deleteSituation(situationId) {
    const { error } = await supabase.from("situations").delete().eq("id", situationId);
    if (error) throw new Error(error.message);
  },

  async finalizeSituation(situationId, payload: FinalizeSituationPayload) {
    const { error } = await supabase
      .from("situations")
      .update({
        status: "final",
        finalized_at: new Date().toISOString(),
        pct_snapshot: payload.pct,
        amount_eur_snapshot: payload.amountEur,
        amount_lei_snapshot: payload.amountLei,
        conversion_rate: payload.conversionRate,
      })
      .eq("id", situationId);
    if (error) throw new Error(error.message);
  },
});
