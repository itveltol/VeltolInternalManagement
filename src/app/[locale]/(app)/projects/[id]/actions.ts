"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Project } from "@/lib/types/project";
import type { ChecklistItemRecord, DailyLogRecord } from "@/lib/types/checklist";

export type ActionState = { error?: string; success?: string } | null;

async function getChecklistPath(projectId: number) {
  const locale = await getLocale();
  return `/${locale}/projects/${projectId}`;
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

function intOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === "") return null;
  const n = parseInt(raw as string, 10);
  return isNaN(n) ? null : n;
}

export async function getProject(projectId: number): Promise<Project | null> {
  const { supabase } = await requireAuth();
  const { data } = await supabase
    .from("projects")
    .select("*, manager:profiles!manager_id(first_name, last_name)")
    .eq("id", projectId)
    .single();
  return (data ?? null) as unknown as Project | null;
}

export async function getChecklistRecords(
  projectId: number,
): Promise<ChecklistItemRecord[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("project_checklist_items")
    .select("*")
    .eq("project_id", projectId)
    .order("item_number");
  if (error) throw new Error(error.message);
  return (data ?? []) as ChecklistItemRecord[];
}

export async function upsertChecklistItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();

    const projectId = Number(formData.get("project_id"));
    const itemNumber = Number(formData.get("item_number"));
    if (!projectId || !itemNumber) return { error: "errorGeneric" };

    const plan_total = intOrNull(formData.get("plan_total"));
    const zile       = intOrNull(formData.get("zile"));
    const notes      = (formData.get("notes") as string | null) || null;

    const { error } = await supabase
      .from("project_checklist_items")
      .upsert(
        { project_id: projectId, item_number: itemNumber, plan_total, zile, notes },
        { onConflict: "project_id,item_number" },
      );

    if (error) return { error: "errorGeneric" };

    revalidatePath(await getChecklistPath(projectId));
    return { success: "itemSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden")
      return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function logTodayRealizat(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();

    const itemId    = Number(formData.get("item_id"));
    const projectId = Number(formData.get("project_id"));
    const realizat  = intOrNull(formData.get("realizat"));

    if (!itemId || !projectId || realizat === null)
      return { error: "errorGeneric" };

    // Upsert into daily log — one record per item per day
    const { error: logError } = await supabase
      .from("checklist_daily_log")
      .upsert(
        { item_id: itemId, log_date: new Date().toISOString().slice(0, 10), realizat },
        { onConflict: "item_id,log_date" },
      );

    if (logError) return { error: "errorGeneric" };

    // Recompute realizat as the sum of all daily log entries for this item
    const { data: logRows, error: sumError } = await supabase
      .from("checklist_daily_log")
      .select("realizat")
      .eq("item_id", itemId);

    if (sumError) return { error: "errorGeneric" };

    const total = (logRows ?? []).reduce((acc, r) => acc + (r.realizat ?? 0), 0);

    const { error: itemError } = await supabase
      .from("project_checklist_items")
      .update({ realizat: total })
      .eq("id", itemId);

    if (itemError) return { error: "errorGeneric" };

    revalidatePath(await getChecklistPath(projectId));
    return { success: "todaySaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden")
      return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getDailyLog(
  itemId: number,
): Promise<DailyLogRecord[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("checklist_daily_log")
    .select("*")
    .eq("item_id", itemId)
    .order("log_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DailyLogRecord[];
}
