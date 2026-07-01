import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientsApiClient, CreateClientPayload } from "./types";
import type { Client, ClientRef } from "../types";

export const createSupabaseClientsClient = (supabase: SupabaseClient): ClientsApiClient => ({
  async getClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Client[];
  },

  async getClientRefs() {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as ClientRef[];
  },

  async getClientById(id) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Client | null;
  },

  async createClient(payload: CreateClientPayload) {
    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateClient(id, payload: CreateClientPayload) {
    const { error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteClient(id) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
});
