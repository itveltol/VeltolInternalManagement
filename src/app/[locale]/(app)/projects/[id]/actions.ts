"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import { createSupabaseMaintenanceClient } from "@/features/projects/maintenance/api/supabaseMaintenanceClient";
import * as checklistService from "@/features/projects/checklists/services/checklistService";
import * as projectService from "@/features/projects/services/projectService";
import * as teamService from "@/features/teams/services/teamService";
import * as maintenanceRecordsService from "@/features/projects/maintenance/services/maintenanceRecordsService";
import type { MaintenancePeriod } from "@/features/projects/maintenance/types";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { Project, ProjectManager } from "@/features/projects/types";
import type { DailyLogRecord } from "@/features/projects/checklists/types";
import type { Team } from "@/features/teams/types";
import type { ClientRef } from "@/features/clients/types";
import * as clientService from "@/features/clients/services/clientService";
import type { SubcontractorRef, ProjectSubcontractorAssignment } from "@/features/subcontractors/types";
import { createSupabaseSubcontractorsClient } from "@/features/subcontractors/api/supabaseSubcontractorsClient";
import * as subcontractorService from "@/features/subcontractors/services/subcontractorService";

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
  await requireAuth();
  return projectService.getCachedProjectManagers();
}

export async function getClientRefs(): Promise<ClientRef[]> {
  await requireAuth();
  return clientService.getCachedClientRefs();
}

export async function getSubcontractorRefs(): Promise<SubcontractorRef[]> {
  await requireAuth();
  return subcontractorService.getCachedSubcontractorRefs();
}

export async function getSubcontractorAssignment(projectId: number): Promise<ProjectSubcontractorAssignment | null> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSubcontractorsClient(supabase);
  return subcontractorService.getCurrentAssignment(api, projectId);
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
    const projectsClient = createSupabaseProjectsClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const itemNumber = Number(formData.get("item_number"));
    if (!projectId || !itemNumber) return { error: "errorGeneric" };

    const plan_total = intOrNull(formData.get("plan_total"));
    const zile = intOrNull(formData.get("zile"));
    const notes = (formData.get("notes") as string | null) || null;

    let persons_allocated = intOrNull(formData.get("persons_allocated"));
    if (persons_allocated !== null) {
      const project = await projectService.getProjectById(projectsClient, projectId);
      const teamMemberCount = project?.team ? await getTeamMemberCount(supabase, project.team.id) : 0;
      persons_allocated = Math.min(Math.max(0, persons_allocated), teamMemberCount);
    }
    const units_per_person_day = intOrNull(formData.get("units_per_person_day"));

    await checklistService.upsertChecklistItem(client, {
      projectId, itemNumber, plan_total, zile, persons_allocated, units_per_person_day, notes,
    });

    revalidatePath(await getChecklistPath(projectId));
    await revalidateDerivedViews(projectId);
    return { success: "itemSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

async function getTeamMemberCount(supabase: Parameters<typeof createSupabaseTeamsClient>[0], teamId: number): Promise<number> {
  const client = createSupabaseTeamsClient(supabase);
  const team = await teamService.getTeamById(client, teamId);
  return team?.member_count ?? 0;
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

export async function getTeamsForProject(): Promise<Team[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseTeamsClient(supabase);
  return teamService.getTeams(client);
}

export async function getMaintenanceChecks(projectId: number) {
  const { supabase } = await requireAuth();
  const client = createSupabaseMaintenanceClient(supabase);
  return maintenanceRecordsService.getMaintenanceChecks(client, projectId);
}

export async function setMaintenanceCheckAction(
  projectId: number,
  year: number,
  period: MaintenancePeriod,
  checked: boolean,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseMaintenanceClient(supabase);

    await maintenanceRecordsService.setMaintenanceCheck(client, {
      projectId, year, period, checked, checkedBy: user.id,
    });

    revalidatePath(await getChecklistPath(projectId));
    return { success: "checkSaved" };
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

export async function getProjectFinancials(projectId: number) {
  const { supabase } = await requireAuth();
  const { createSupabaseFinanceClient } = await import("@/features/finance/api/supabaseFinanceClient");
  const { createSupabaseExchangeRatesClient } = await import("@/features/exchangeRates/api/supabaseExchangeRatesClient");
  const { getTodaysRate } = await import("@/features/exchangeRates/services/exchangeRateService");
  const financeService = await import("@/features/finance/services/financeService");

  const api = createSupabaseFinanceClient(supabase);
  const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);

  const [categories, lines, rate] = await Promise.all([
    financeService.getCostCategories(api),
    financeService.getBudgetLines(api, projectId),
    getTodaysRate(exchangeRateClient),
  ]);

  return { categories, lines, exchangeRate: rate?.eurRon ?? null };
}
