"use server";

import { createClient } from "@/core/supabase/server";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as checklistService from "@/features/projects/checklists/services/checklistService";
import * as projectService from "@/features/projects/services/projectService";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Project } from "@/features/projects/types";
import type { DailyLogRecord } from "@/features/projects/checklists/types";

export type ActionState = { error?: string; success?: string } | null;

async function getChecklistPath(projectId: number) {
  const locale = await getLocale();
  return `/${locale}/projects/${projectId}`;
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

function intOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === "") return null;
  const n = parseInt(raw as string, 10);
  return isNaN(n) ? null : n;
}

export async function getProject(projectId: number): Promise<Project | null> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjectById(client, projectId);
}

export async function getChecklistRecords(projectId: number) {
  const { supabase } = await requireAuth();
  const client = createSupabaseChecklistClient(supabase);
  return checklistService.getChecklistRecords(client, projectId);
}

export async function upsertChecklistItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseChecklistClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const itemNumber = Number(formData.get("item_number"));
    if (!projectId || !itemNumber) return { error: "errorGeneric" };

    const plan_total = intOrNull(formData.get("plan_total"));
    const zile = intOrNull(formData.get("zile"));
    const notes = (formData.get("notes") as string | null) || null;

    await checklistService.upsertChecklistItem(client, { projectId, itemNumber, plan_total, zile, notes });

    revalidatePath(await getChecklistPath(projectId));
    return { success: "itemSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function logTodayRealizat(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseChecklistClient(supabase);

    const itemId = Number(formData.get("item_id"));
    const projectId = Number(formData.get("project_id"));
    const realizat = intOrNull(formData.get("realizat"));

    if (!itemId || !projectId || realizat === null) return { error: "errorGeneric" };

    await checklistService.logTodayRealizat(client, itemId, projectId, realizat);

    revalidatePath(await getChecklistPath(projectId));
    return { success: "todaySaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getDailyLog(itemId: number): Promise<DailyLogRecord[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseChecklistClient(supabase);
  return checklistService.getDailyLog(client, itemId);
}
