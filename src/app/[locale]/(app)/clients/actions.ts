"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseClientsClient } from "@/features/clients/api/supabaseClientsClient";
import * as clientService from "@/features/clients/services/clientService";
import type { Client, ClientRef } from "@/features/clients/types";

export type ActionState = { error?: string; success?: string; clientId?: number } | null;

async function getClientsPath() {
  const locale = await getLocale();
  return `/${locale}/clients`;
}

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireMutator() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["admin", "project_manager"].includes(profile?.role ?? "")) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

function extractClientPayload(formData: FormData) {
  const str = (key: string) => {
    const v = formData.get(key) as string | null;
    return v && v.trim() !== "" ? v.trim() : null;
  };
  return {
    type: (formData.get("type") as string) || "company",
    name: ((formData.get("name") as string) ?? "").trim(),
    cui: str("cui"),
    j_number: str("j_number"),
    legal_rep: str("legal_rep"),
    cnp: str("cnp"),
    id_series: str("id_series"),
    id_number: str("id_number"),
    reg_address: str("reg_address"),
    contact_person: str("contact_person"),
    email: str("email"),
    phone: str("phone"),
    notes: str("notes"),
  };
}

export async function getClients(): Promise<Client[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseClientsClient(supabase);
  return clientService.getClients(api);
}

export async function getClientRefs(): Promise<ClientRef[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseClientsClient(supabase);
  return clientService.getClientRefs(api);
}

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseClientsClient(supabase);
    const { id } = await clientService.createClient(api, extractClientPayload(formData));
    revalidatePath(await getClientsPath());
    return { success: "clientCreated", clientId: id };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseClientsClient(supabase);
    const clientId = Number(formData.get("clientId"));
    await clientService.updateClient(api, clientId, extractClientPayload(formData));
    revalidatePath(await getClientsPath());
    return { success: "clientSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteClientAction(id: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();
    if (profile?.role !== "admin") return { error: "errorNotAllowed" };
    const api = createSupabaseClientsClient(supabase);
    await clientService.deleteClient(api, id);
    revalidatePath(await getClientsPath());
    return { success: "clientDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
