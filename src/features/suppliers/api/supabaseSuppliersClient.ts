import type { SupabaseClient } from "@supabase/supabase-js";
import type { SuppliersApiClient, SupplierPayload } from "./types";
import type { Supplier, SupplierRef } from "../types";

export const createSupabaseSuppliersClient = (supabase: SupabaseClient): SuppliersApiClient => ({
  async getSuppliers() {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Supplier[];
  },

  async getSupplierRefs() {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as SupplierRef[];
  },

  async getSupplierById(id) {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Supplier | null;
  },

  async createSupplier(payload: SupplierPayload) {
    const { data, error } = await supabase
      .from("suppliers")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateSupplier(id, payload: SupplierPayload) {
    const { error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteSupplier(id) {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") throw new Error("HasReferences");
      throw new Error(error.message);
    }
  },
});
