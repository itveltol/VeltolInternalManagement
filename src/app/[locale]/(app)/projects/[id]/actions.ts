"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import * as checklistService from "@/features/projects/checklists/services/checklistService";
import * as projectService from "@/features/projects/services/projectService";
import * as teamService from "@/features/teams/services/teamService";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Project, ProjectManager } from "@/features/projects/types";
import type { DailyLogRecord } from "@/features/projects/checklists/types";
import type { Team } from "@/features/teams/types";
import type { ClientRef } from "@/features/clients/types";
import { createSupabaseClientsClient } from "@/features/clients/api/supabaseClientsClient";
import * as clientService from "@/features/clients/services/clientService";

export type ActionState = { error?: string; success?: string } | null;

async function getChecklistPath(projectId: number) {
  const locale = await getLocale();
  return `/${locale}/projects/${projectId}`;
}

/**
 * Checklist writes can flip a mapped Matrice cell (via a DB trigger) and, from
 * there, the project's derived progress_pct/status — revalidate those views
 * too, not just the checklist page, so they don't show stale data.
 */
async function revalidateDerivedViews(projectId: number) {
  const locale = await getLocale();
  revalidatePath(`/${locale}/matrice-status`);
  revalidatePath(`/${locale}/projects`);
  revalidatePath(`/${locale}/projects/${projectId}`);
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

function intOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === "") return null;
  const n = parseInt(raw as string, 10);
  return isNaN(n) ? null : n;
}

function strOrNull(raw: FormDataEntryValue | null): string | null {
  if (raw === null) return null;
  const s = (raw as string).trim();
  return s === "" ? null : s;
}

export async function getProject(projectId: number): Promise<Project | null> {
  await requireAuth();
  // "projects: scoped select" RLS only allows admins or the assigned manager
  // to read a project via the session-scoped client — but any authenticated
  // role may need to view/work a project's checklist, gantt, or documents, so
  // this reads via the service-role client instead (same as dashboard/action.ts).
  const client = createSupabaseProjectsClient(createAdminClient());
  return projectService.getProjectById(client, projectId);
}

export async function getProjectManagers(): Promise<ProjectManager[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjectManagers(client);
}

export async function getClientRefs(): Promise<ClientRef[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseClientsClient(supabase);
  return clientService.getClientRefs(api);
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
    await revalidateDerivedViews(projectId);
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
    await revalidateDerivedViews(projectId);
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

export async function getTeamsForGantt(): Promise<Team[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseTeamsClient(supabase);
  return teamService.getTeams(client);
}

export async function scheduleChecklistItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseChecklistClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const itemNumber = Number(formData.get("item_number"));
    if (!projectId || !itemNumber) return { error: "errorGeneric" };

    const start_date = strOrNull(formData.get("start_date"));
    const end_date = strOrNull(formData.get("end_date"));
    const team_id = intOrNull(formData.get("team_id"));

    await checklistService.scheduleChecklistItem(client, {
      projectId, itemNumber, start_date, end_date, team_id,
    });

    revalidatePath(await getChecklistPath(projectId));
    return { success: "taskScheduled" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function unscheduleChecklistItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseChecklistClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const itemNumber = Number(formData.get("item_number"));
    if (!projectId || !itemNumber) return { error: "errorGeneric" };

    await checklistService.scheduleChecklistItem(client, {
      projectId, itemNumber, start_date: null, end_date: null, team_id: null,
    });

    revalidatePath(await getChecklistPath(projectId));
    return { success: "taskUnscheduled" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function createCustomTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseChecklistClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const name = ((formData.get("name") as string) ?? "").trim();
    const phase = ((formData.get("phase") as string) ?? "").trim();
    if (!projectId || !name) return { error: "errorGeneric" };

    const plan_total = intOrNull(formData.get("plan_total"));
    const zile = intOrNull(formData.get("zile"));
    const start_date = strOrNull(formData.get("start_date"));
    const end_date = strOrNull(formData.get("end_date"));
    const team_id = intOrNull(formData.get("team_id"));

    await checklistService.createCustomTask(client, {
      projectId, name, phase, plan_total, zile, start_date, end_date, team_id,
    });

    revalidatePath(await getChecklistPath(projectId));
    return { success: "taskCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    if (e instanceof Error && e.message === "customTaskLimitReached") return { error: "errorCustomTaskLimit" };
    return { error: "errorGeneric" };
  }
}

export async function deleteCustomTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseChecklistClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const itemNumber = Number(formData.get("item_number"));
    if (!projectId || !itemNumber) return { error: "errorGeneric" };

    await checklistService.deleteCustomTask(client, projectId, itemNumber);

    revalidatePath(await getChecklistPath(projectId));
    return { success: "taskDeleted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getProjectDocuments(projectId: number) {
  const { supabase } = await requireAuth();
  const { createSupabaseDocumentsClient } = await import("@/features/documents/api/supabaseDocumentsClient");
  const { getDocumentsByProject } = await import("@/features/documents/services/documentService");
  const api = createSupabaseDocumentsClient(supabase);
  return getDocumentsByProject(api, projectId);
}

export async function getLinkedDocuments(linkedType: string, linkedId: string) {
  const { supabase } = await requireAuth();
  const { createSupabaseDocumentsClient } = await import("@/features/documents/api/supabaseDocumentsClient");
  const { getDocumentsByLinkedId } = await import("@/features/documents/services/documentService");
  const api = createSupabaseDocumentsClient(supabase);
  return getDocumentsByLinkedId(api, linkedType, linkedId);
}
