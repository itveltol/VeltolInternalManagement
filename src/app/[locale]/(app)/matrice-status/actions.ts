"use server";

import { getSessionUser } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseMatriceClient } from "@/features/matrice/api/supabaseMatriceClient";
import * as matriceService from "@/features/matrice/services/matriceService";
import * as shownProjectsService from "@/features/hiddenProjects/services/shownProjectsService";
import { MAX_VISIBLE_PROJECTS } from "@/features/hiddenProjects/constants";
import type { Activity, MatrixData, MatrixProject, ActivityStatus } from "@/features/matrice/types";

export type ActionState = { error?: string; success?: string } | null;

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
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
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseMatriceClient(supabase);
    await matriceService.setCellStatus(client, projectId, activityId, status, user.id);
    const locale = await getLocale();
    revalidatePath(`/${locale}/matrice-status`);
    return { success: "saved" };
  } catch {
    return { error: "errorGeneric" };
  }
}
