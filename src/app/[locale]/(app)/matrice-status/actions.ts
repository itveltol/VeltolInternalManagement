"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseMatriceClient } from "@/features/matrice/api/supabaseMatriceClient";
import * as matriceService from "@/features/matrice/services/matriceService";
import * as shownProjectsService from "@/features/hiddenProjects/services/shownProjectsService";
import { MAX_VISIBLE_PROJECTS } from "@/features/hiddenProjects/constants";
import type { Activity, MatrixData, MatrixProject, ActivityStatus } from "@/features/matrice/types";
import { resolveItemNumberForActivity } from "@/features/matrice/services/checklistActivityMapping";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import * as checklistService from "@/features/projects/checklists/services/checklistService";

export type ActionState = { error?: string; success?: string } | null;

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

export async function getMatrixData(projectIds: number[]): Promise<MatrixData> {
  const { supabase } = await requireAuth();
  const client = createSupabaseMatriceClient(supabase);
  return matriceService.getMatrix(client, projectIds);
}

export async function getAvailableProjects(): Promise<MatrixProject[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseMatriceClient(supabase);
  return matriceService.getAllProjects(client);
}

export async function getShownMatriceProjectIds(): Promise<number[]> {
  const { supabase, user } = await requireAuth();
  return shownProjectsService.getShownProjectIds(supabase, user.id, "matrice");
}

export async function showMatriceProject(projectId: number): Promise<ActionState> {
  const { supabase, user } = await requireAuth();
  const shownIds = await shownProjectsService.getShownProjectIds(supabase, user.id, "matrice");
  if (!shownIds.includes(projectId) && shownIds.length >= MAX_VISIBLE_PROJECTS) {
    return { error: "errorMaxProjects" };
  }
  await shownProjectsService.showProject(supabase, user.id, "matrice", projectId);
  return { success: "saved" };
}

/**
 * Ensure a project is pinned on the Matrice view, evicting the
 * longest-shown project if the cap is already reached — used when
 * navigating in from a Gantt bar, where the user didn't get a chance
 * to pick which project to swap out themselves.
 */
export async function pinMatriceProject(projectId: number): Promise<void> {
  const { supabase, user } = await requireAuth();
  const shownIds = await shownProjectsService.getShownProjectIdsByAge(supabase, user.id, "matrice");
  if (shownIds.includes(projectId)) return;
  if (shownIds.length >= MAX_VISIBLE_PROJECTS) {
    const oldest = shownIds[0];
    await shownProjectsService.unshowProject(supabase, user.id, "matrice", oldest);
  }
  await shownProjectsService.showProject(supabase, user.id, "matrice", projectId);
}

export async function unshowMatriceProject(projectId: number): Promise<void> {
  const { supabase, user } = await requireAuth();
  await shownProjectsService.unshowProject(supabase, user.id, "matrice", projectId);
}

export async function getActivities(): Promise<Activity[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseMatriceClient(supabase);
  return client.getActivities();
}

export async function setCellStatus(
  projectId: number,
  activityId: number,
  status: ActivityStatus,
  expiresAt?: string | null,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseMatriceClient(supabase);
    await matriceService.setCellStatus(client, projectId, activityId, status, user.id, expiresAt);
    const locale = await getLocale();
    revalidatePath(`/${locale}/matrice-status`);
    return { success: "saved" };
  } catch {
    return { error: "errorGeneric" };
  }
}

/**
 * Reverse sync for the ~28 checklist-mapped Matrice activities: a manual
 * status edit in Matrice writes back to the linked checklist item's
 * `realizat`, so the two views don't silently diverge. Cells with no
 * checklist_activity_map entry are plain manual edits — nothing to sync.
 * No-ops if the item has no plan_total set yet (nothing meaningful to mark
 * "done" against).
 */
export async function syncChecklistFromMatriceCell(
  projectId: number,
  activityId: number,
  status: ActivityStatus,
  activities: Activity[],
): Promise<void> {
  const itemNumber = resolveItemNumberForActivity(activityId, activities);
  if (itemNumber === null) return;

  const { supabase } = await requireMutator();
  const checklistClient = createSupabaseChecklistClient(supabase);
  const records = await checklistService.getChecklistRecords(checklistClient, projectId);
  const record = records.find((r) => r.item_number === itemNumber);
  const planTotal = record?.plan_total;
  if (!planTotal) return;

  const { error } = await supabase
    .from("project_checklist_items")
    .update({ realizat: status === "finalizat" ? planTotal : 0 })
    .eq("project_id", projectId)
    .eq("item_number", itemNumber);
  if (error) throw new Error(error.message);

  const locale = await getLocale();
  revalidatePath(`/${locale}/projects/${projectId}`);
}
