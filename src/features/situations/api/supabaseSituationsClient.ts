import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SituationsApiClient,
  CreateSituationPayload,
  UpdateSituationPayload,
  FinalizeSituationPayload,
} from "./types";
import type { Situation, SituationWithProject, SituationContractRef } from "../types";

const CONTRACT_SELECT =
  "contract:contracts(id, project_id, value_eur, value_lei, currency, conversion_rate, contract_number, contract_date, contract_type, vat_rate, project:projects(id, name, project_category, current_phase, client:clients(id, name)))";

/** contract.progress_pct isn't a stored column (see contract_progress_pct()
 * in supabase/migrations/20260908000128_situations_contract_id.sql) —
 * computed on demand per contract and merged in here after the main select. */
async function attachContractProgress(
  supabase: SupabaseClient,
  rows: (Omit<SituationWithProject, "contract"> & { contract: Omit<SituationContractRef, "progress_pct"> })[],
): Promise<SituationWithProject[]> {
  const contractIds = Array.from(new Set(rows.map((r) => r.contract.id)));
  const progressByContractId = new Map<number, number>();
  await Promise.all(
    contractIds.map(async (id) => {
      const { data, error } = await supabase.rpc("contract_progress_pct", { p_contract_id: id });
      if (error) throw new Error(error.message);
      progressByContractId.set(id, (data as number) ?? 0);
    }),
  );
  return rows.map((row) => ({
    ...row,
    contract: { ...row.contract, progress_pct: progressByContractId.get(row.contract.id) ?? 0 },
  })) as SituationWithProject[];
}

export const createSupabaseSituationsClient = (supabase: SupabaseClient): SituationsApiClient => ({
  async getAllSituationsWithProjects() {
    const { data, error } = await supabase
      .from("situations")
      .select(`*, ${CONTRACT_SELECT}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return attachContractProgress(supabase, (data ?? []) as unknown as (Omit<SituationWithProject, "contract"> & { contract: Omit<SituationContractRef, "progress_pct"> })[]);
  },

  async getSituationsForContract(contractId) {
    const { data, error } = await supabase
      .from("situations")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Situation[];
  },

  async getAllBillableSituations() {
    const { data, error } = await supabase
      .from("situations")
      .select("*")
      .in("status", ["final", "paid"]);
    if (error) throw new Error(error.message);
    return (data ?? []) as Situation[];
  },

  async createSituation(payload: CreateSituationPayload) {
    const { data, error } = await supabase
      .from("situations")
      .insert({ project_id: payload.projectId, contract_id: payload.contractId, name: payload.name, status: "draft" })
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

  async markSituationPaid(situationId, paidAt) {
    const { error } = await supabase
      .from("situations")
      .update({ status: "paid", paid_at: paidAt })
      .eq("id", situationId);
    if (error) throw new Error(error.message);
  },
});
