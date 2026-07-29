import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubcontractorsApiClient, CreateSubcontractorPayload } from "./types";
import type { Subcontractor, SubcontractorRef } from "../types";

export const createSupabaseSubcontractorsClient = (supabase: SupabaseClient): SubcontractorsApiClient => ({
  async getSubcontractors() {
    const { data, error } = await supabase
      .from("subcontractors")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Subcontractor[];
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
    if (error) throw new Error(error.message);
  },
});
