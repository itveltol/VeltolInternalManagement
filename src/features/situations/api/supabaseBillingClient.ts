import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingApiClient, UpsertBillingPayload } from "./billingTypes";
import type { ProjectBilling } from "../types";

export const createSupabaseBillingClient = (supabase: SupabaseClient): BillingApiClient => ({
  async getAllBilling() {
    const { data, error } = await supabase.from("project_billing").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectBilling[];
  },

  async getBillingForProject(projectId) {
    const { data, error } = await supabase
      .from("project_billing")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as ProjectBilling | null) ?? null;
  },

  async upsertBilling(projectId, payload: UpsertBillingPayload, updatedBy: string | null) {
    const { error } = await supabase
      .from("project_billing")
      .upsert(
        { project_id: projectId, ...payload, updated_by: updatedBy },
        { onConflict: "project_id" },
      );
    if (error) throw new Error(error.message);
  },
});
