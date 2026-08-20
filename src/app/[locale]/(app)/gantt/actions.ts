"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseMatriceClient } from "@/features/matrice/api/supabaseMatriceClient";
import * as matriceService from "@/features/matrice/services/matriceService";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import { validatePhaseDates } from "@/features/gantt/services/ganttPhaseService";
import * as shownProjectsService from "@/features/hiddenProjects/services/shownProjectsService";
import { MAX_VISIBLE_PROJECTS } from "@/features/hiddenProjects/constants";
import { createSupabaseSubcontractorsClient } from "@/features/subcontractors/api/supabaseSubcontractorsClient";
import * as subcontractorService from "@/features/subcontractors/services/subcontractorService";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import * as checklistService from "@/features/projects/checklists/services/checklistService";
import type { Activity, MatricePhase, MatrixCell } from "@/features/matrice/types";
import type { Project } from "@/features/projects/types";
import type { GanttPhaseKey } from "@/features/gantt/types";
import type { ChecklistItemRecord } from "@/features/projects/checklists/types";

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

export async function getShownGanttProjectIds(): Promise<number[]> {
  const { supabase, user } = await requireAuth();
  return shownProjectsService.getShownProjectIds(supabase, user.id, "gantt");
}

export async function showGanttProject(projectId: number): Promise<ActionState> {
  const { supabase, user } = await requireAuth();
  const shownIds = await shownProjectsService.getShownProjectIds(supabase, user.id, "gantt");
  if (!shownIds.includes(projectId) && shownIds.length >= MAX_VISIBLE_PROJECTS) {
    return { error: "errorMaxProjects" };
  }
  await shownProjectsService.showProject(supabase, user.id, "gantt", projectId);
  return { success: "saved" };
}

export async function unshowGanttProject(projectId: number): Promise<void> {
  const { supabase, user } = await requireAuth();
  await shownProjectsService.unshowProject(supabase, user.id, "gantt", projectId);
}

export async function getGanttMatriceData(
  projectIds: number[],
): Promise<{
  activities: Activity[];
  phases: MatricePhase[];
  cells: MatrixCell[];
  checklistRecordsByProjectId: Record<number, ChecklistItemRecord[]>;
}> {
  const { supabase } = await requireAuth();
  const matriceClient = createSupabaseMatriceClient(supabase);
  const checklistClient = createSupabaseChecklistClient(supabase);
  const [activities, phases, cells, checklistRecords] = await Promise.all([
    matriceService.getCachedActivities(),
    matriceService.getCachedPhases(),
    matriceClient.getCells(projectIds),
    checklistService.getChecklistRecordsForProjects(checklistClient, projectIds),
  ]);
  return {
    activities,
    phases,
    cells,
    checklistRecordsByProjectId: checklistService.groupChecklistRecordsByProjectId(checklistRecords),
  };
}

export async function savePhaseDates(
  projectId: number,
  phaseKey: GanttPhaseKey,
  startDate: string | null,
  endDate: string | null,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);

    const project = await projectService.getProjectById(client, projectId);
    if (!project) return { error: "errorGeneric" };

    const validationError = validatePhaseDates(startDate, endDate);
    if (validationError) return { error: validationError };

    await projectService.updatePhaseDates(client, projectId, phaseKey, {
      start_date: startDate,
      end_date: endDate,
    }, user.id);
    const locale = await getLocale();
    revalidatePath(`/${locale}/gantt`);
    revalidatePath(`/${locale}/projects/${projectId}`);
    return { success: "saved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

/**
 * For a subcontracted project, the Gantt "execution" segment's dates come
 * from the current project_subcontractors assignment, not the project's own
 * execution_start_date/execution_end_date (see buildProjectGanttRows) — so
 * editing from the Gantt tab must write there too, or the edit has no visible
 * effect. Only start_date/deadline are touched; price/notes on the existing
 * assignment are read back and resubmitted unchanged.
 */
export async function saveSubcontractedExecutionDates(
  projectId: number,
  startDate: string | null,
  endDate: string | null,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();

    const validationError = validatePhaseDates(startDate, endDate);
    if (validationError) return { error: validationError };

    const api = createSupabaseSubcontractorsClient(supabase);
    const current = await subcontractorService.getCurrentAssignment(api, projectId);
    if (!current) return { error: "errorGeneric" };

    await subcontractorService.upsertCurrentAssignment(api, projectId, {
      subcontractor_id: current.subcontractor_id,
      price_eur: current.price_eur,
      price_lei: current.price_lei,
      currency: current.currency,
      conversion_rate: current.conversion_rate,
      start_date: startDate,
      deadline: endDate,
      notes: current.notes,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/gantt`);
    revalidatePath(`/${locale}/projects/${projectId}`);
    return { success: "saved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
