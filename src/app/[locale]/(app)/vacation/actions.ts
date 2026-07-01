"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseVacationClient } from "@/features/vacation/api/supabaseVacationClient";
import * as vacationService from "@/features/vacation/services/vacationService";
import type { VacationRequest } from "@/features/vacation/types";

export type ActionState = { error?: string; success?: string } | null;

async function getVacationPath() {
  const locale = await getLocale();
  return `/${locale}/vacation`;
}

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return { supabase, user };
}

export async function getVacationRequests(): Promise<VacationRequest[]> {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const client = createSupabaseVacationClient(supabase);
  return vacationService.getRequests(client, user.id, isAdmin);
}

export async function createVacationRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseVacationClient(supabase);
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;
    const reason = (formData.get("reason") as string | null)?.trim() || null;
    await vacationService.createRequest(client, { user_id: user.id, start_date, end_date, reason });
    revalidatePath(await getVacationPath());
    return { success: "requestCreated" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function updateVacationRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseVacationClient(supabase);
    const id = Number(formData.get("id"));
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;
    const reason = (formData.get("reason") as string | null)?.trim() || null;

    // Verify ownership before updating
    const requests = await vacationService.getRequests(client, user.id, false);
    const request = requests.find((r) => r.id === id);
    if (!request || !vacationService.canEdit(request, user.id)) {
      return { error: "errorNotAllowed" };
    }

    await vacationService.updateRequest(client, id, { start_date, end_date, reason });
    revalidatePath(await getVacationPath());
    return { success: "requestSaved" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function cancelVacationRequest(id: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseVacationClient(supabase);
    await vacationService.cancelRequest(client, id, user.id);
    revalidatePath(await getVacationPath());
    return { success: "requestCancelled" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function approveVacationRequest(id: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAdmin();
    const client = createSupabaseVacationClient(supabase);
    await vacationService.approveRequest(client, id, user.id);
    revalidatePath(await getVacationPath());
    return { success: "requestApproved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function rejectVacationRequest(id: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAdmin();
    const client = createSupabaseVacationClient(supabase);
    await vacationService.rejectRequest(client, id, user.id);
    revalidatePath(await getVacationPath());
    return { success: "requestRejected" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function generateVacationDocument(_id: number): Promise<ActionState> {
  // Stub — will be implemented once the document template is provided
  return { error: "notImplemented" };
}
