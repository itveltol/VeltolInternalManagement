"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseSubcontractorsClient } from "@/features/subcontractors/api/supabaseSubcontractorsClient";
import * as subcontractorService from "@/features/subcontractors/services/subcontractorService";
import type { Subcontractor, SubcontractorRef } from "@/features/subcontractors/types";

export type ActionState =
  | { error?: string; success?: string; subcontractor?: { id: number; name: string } }
  | null;

async function getSubcontractorsPath() {
  const locale = await getLocale();
  return `/${locale}/subcontractors`;
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

function extractSubcontractorPayload(formData: FormData) {
  const str = (key: string) => {
    const v = formData.get(key) as string | null;
    return v && v.trim() !== "" ? v.trim() : null;
  };
  const num = (key: string) => {
    const v = formData.get(key) as string | null;
    if (!v || v.trim() === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  return {
    name: ((formData.get("name") as string) ?? "").trim(),
    contact_person: str("contact_person"),
    phone: str("phone"),
    price_eur: num("price_eur"),
    price_lei: num("price_lei"),
    deadline: str("deadline"),
    notes: str("notes"),
  };
}

export async function getSubcontractors(): Promise<Subcontractor[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSubcontractorsClient(supabase);
  return subcontractorService.getSubcontractors(api);
}

export async function getSubcontractorRefs(): Promise<SubcontractorRef[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSubcontractorsClient(supabase);
  return subcontractorService.getSubcontractorRefs(api);
}

export async function createSubcontractorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseSubcontractorsClient(supabase);
    const payload = extractSubcontractorPayload(formData);
    const result = await subcontractorService.createSubcontractor(api, payload);
    revalidatePath(await getSubcontractorsPath());
    return { success: "subcontractorCreated", subcontractor: { id: result.id, name: payload.name } };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateSubcontractorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseSubcontractorsClient(supabase);
    const subcontractorId = Number(formData.get("subcontractorId"));
    await subcontractorService.updateSubcontractor(api, subcontractorId, extractSubcontractorPayload(formData));
    revalidatePath(await getSubcontractorsPath());
    return { success: "subcontractorSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteSubcontractorAction(id: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const api = createSupabaseSubcontractorsClient(supabase);
    await subcontractorService.deleteSubcontractor(api, id);
    revalidatePath(await getSubcontractorsPath());
    return { success: "subcontractorDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
