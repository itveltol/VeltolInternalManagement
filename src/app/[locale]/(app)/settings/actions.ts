"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseHolidaysClient } from "@/features/holidays/api/supabaseHolidaysClient";
import * as holidayService from "@/features/holidays/services/holidayService";
import type { Holiday } from "@/features/holidays/types";

export type ActionState = { error?: string; success?: string } | null;

async function getSettingsPath() {
  const locale = await getLocale();
  return `/${locale}/settings`;
}

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (role !== "admin") throw new Error("Forbidden");
  return { supabase, user };
}

export async function getHolidays(): Promise<Holiday[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseHolidaysClient(supabase);
  return holidayService.getHolidays(client);
}

export async function createHoliday(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseHolidaysClient(supabase);
    const date = formData.get("date") as string;
    const name = (formData.get("name") as string | null)?.trim() || "";
    await holidayService.createHoliday(client, { date, name });
    revalidatePath(await getSettingsPath());
    return { success: "holidayCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteHoliday(id: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseHolidaysClient(supabase);
    await holidayService.deleteHoliday(client, id);
    revalidatePath(await getSettingsPath());
    return { success: "holidayDeleted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getEmailDigestEnabled(): Promise<boolean> {
  const { supabase, user } = await requireAuth();
  const { data, error } = await supabase
    .from("profiles")
    .select("email_digest_enabled")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);
  return data.email_digest_enabled as boolean;
}

export async function setEmailDigestEnabledAction(enabled: boolean): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await supabase
      .from("profiles")
      .update({ email_digest_enabled: enabled })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath(await getSettingsPath());
    return { success: "emailDigestUpdated" };
  } catch {
    return { error: "errorGeneric" };
  }
}
