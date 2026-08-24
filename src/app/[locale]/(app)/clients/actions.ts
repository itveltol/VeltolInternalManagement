"use server";

import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath, updateTag } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseClientsClient } from "@/features/clients/api/supabaseClientsClient";
import * as clientService from "@/features/clients/services/clientService";
import type { Client, ClientRef } from "@/features/clients/types";
import { parseFormData } from "@/shared/utils/parseFormData";

export type ActionState =
  | { error?: string; success?: string; client?: { id: number; name: string }; fieldErrors?: Record<string, string> }
  | null;

// Trim first, then treat "" as absent — matches the previous str() helper's
// behavior so blank optional fields keep saving as null, not "".
const optionalTrimmed = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().nullable(),
  );

const clientSchema = z.object({
  type: z.enum(["company", "person"]).default("company"),
  name: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
  cui: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().regex(/^RO\d{7,10}$/).nullable(),
  ),
  j_number: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().regex(/^J\d{1,2}\/\d+\/\d{4}$/).nullable(),
  ),
  legal_rep: optionalTrimmed(),
  cnp: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().regex(/^\d{13}$/).nullable(),
  ),
  id_series: optionalTrimmed(),
  id_number: optionalTrimmed(),
  reg_address: optionalTrimmed(),
  contact_person: optionalTrimmed(),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.email().nullable(),
  ),
  phone: optionalTrimmed(),
  notes: optionalTrimmed(),
});

async function getClientsPath() {
  const locale = await getLocale();
  return `/${locale}/clients`;
}

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireMutator() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (!["admin", "project_manager"].includes(role ?? "")) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

export async function getClients(): Promise<Client[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseClientsClient(supabase);
  return clientService.getClients(api);
}

export async function getClientRefs(): Promise<ClientRef[]> {
  await requireAuth();
  return clientService.getCachedClientRefs();
}

export async function getClient(id: number): Promise<Client | null> {
  const { supabase } = await requireAuth();
  const api = createSupabaseClientsClient(supabase);
  return clientService.getClientById(api, id);
}

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const parsed = parseFormData(clientSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    const api = createSupabaseClientsClient(supabase);
    const result = await clientService.createClient(api, parsed.data);
    revalidatePath(await getClientsPath());
    updateTag("clients");
    return { success: "clientCreated", client: { id: result.id, name: parsed.data.name } };
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
    const parsed = parseFormData(clientSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    const api = createSupabaseClientsClient(supabase);
    const clientId = Number(formData.get("clientId"));
    await clientService.updateClient(api, clientId, parsed.data);
    revalidatePath(await getClientsPath());
    updateTag("clients");
    return { success: "clientSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteClientAction(id: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const api = createSupabaseClientsClient(supabase);
    await clientService.deleteClient(api, id);
    revalidatePath(await getClientsPath());
    updateTag("clients");
    return { success: "clientDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
