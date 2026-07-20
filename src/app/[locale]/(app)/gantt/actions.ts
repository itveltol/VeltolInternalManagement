"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseMatriceClient } from "@/features/matrice/api/supabaseMatriceClient";
import * as matriceService from "@/features/matrice/services/matriceService";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import { validatePhaseDates } from "@/features/gantt/services/ganttPhaseService";
import * as hiddenProjectsService from "@/features/hiddenProjects/services/hiddenProjectsService";
import type { Activity, MatrixCell } from "@/features/matrice/types";
import type { Project } from "@/features/projects/types";
import type { GanttPhaseKey } from "@/features/gantt/types";

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

export async function getGanttProjects(): Promise<Project[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjects(client);
}

export async function getHiddenGanttProjectIds(): Promise<number[]> {
  const { supabase, user } = await requireAuth();
  return hiddenProjectsService.getHiddenProjectIds(supabase, user.id, "gantt");
}

export async function hideGanttProject(projectId: number): Promise<void> {
  const { supabase, user } = await requireAuth();
  await hiddenProjectsService.hideProject(supabase, user.id, "gantt", projectId);
}

export async function unhideGanttProject(projectId: number): Promise<void> {
  const { supabase, user } = await requireAuth();
  await hiddenProjectsService.unhideProject(supabase, user.id, "gantt", projectId);
}

export async function getGanttMatriceData(
  projectIds: number[],
): Promise<{ activities: Activity[]; cells: MatrixCell[] }> {
  const { supabase } = await requireAuth();
  const client = createSupabaseMatriceClient(supabase);
  const [activities, cells] = await Promise.all([
    client.getActivities(),
    client.getCells(projectIds),
  ]);
  return { activities, cells };
}

export async function savePhaseDates(
  projectId: number,
  phaseKey: GanttPhaseKey,
  startDate: string | null,
  endDate: string | null,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);

    const project = await projectService.getProjectById(client, projectId);
    if (!project) return { error: "errorGeneric" };

    const validationError = validatePhaseDates(phaseKey, startDate, endDate, project);
    if (validationError) return { error: validationError };

    await projectService.updatePhaseDates(client, projectId, phaseKey, {
      start_date: startDate,
      end_date: endDate,
    });
    const locale = await getLocale();
    revalidatePath(`/${locale}/gantt`);
    return { success: "saved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
