import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contract, ContractsApiClient, CreateContractPayload, UpdateContractPayload } from "./types";

export const createSupabaseContractsClient = (supabase: SupabaseClient): ContractsApiClient => ({
  async getContractsForProject(projectId) {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("project_id", projectId)
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []) as Contract[];
  },

  async getContractsForProjects(projectIds) {
    if (projectIds.length === 0) return [];
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .in("project_id", projectIds)
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []) as Contract[];
  },

  async getContractById(id) {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return (data as Contract) ?? null;
  },

  async getAllContractNumbers() {
    const { data, error } = await supabase
      .from("contracts")
      .select("contract_number");
    if (error) throw new Error(error.message);
    return (data ?? []) as { contract_number: string | null }[];
  },

  async createContract(payload: CreateContractPayload) {
    const { data, error } = await supabase
      .from("contracts")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateContract(id, payload: UpdateContractPayload) {
    const { error } = await supabase
      .from("contracts")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteContract(id) {
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
});
