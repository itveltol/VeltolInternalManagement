"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import { createSupabaseMaintenanceClient } from "@/features/projects/maintenance/api/supabaseMaintenanceClient";
import { createSupabaseExecutionDataClient } from "@/features/projects/executionData/api/supabaseExecutionDataClient";
import { createSupabaseCefBessDataClient } from "@/features/projects/cefBessData/api/supabaseCefBessDataClient";
import * as checklistService from "@/features/projects/checklists/services/checklistService";
import * as projectService from "@/features/projects/services/projectService";
import * as teamService from "@/features/teams/services/teamService";
import * as maintenanceRecordsService from "@/features/projects/maintenance/services/maintenanceRecordsService";
import * as executionDataService from "@/features/projects/executionData/services/executionDataService";
import * as cefBessDataService from "@/features/projects/cefBessData/services/cefBessDataService";
import type { MaintenancePeriod } from "@/features/projects/maintenance/types";
import type { ProjectExecutionData, ProjectStructureConfigRow } from "@/features/projects/executionData/types";
import type { ProjectCefData, ProjectBessData } from "@/features/projects/cefBessData/types";
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
 * there, the project's derived progress_pct/status — revalidate those other
 * views so they don't show stale data next time they're visited. Deliberately
 * does NOT revalidate this project's own page: doing so while a client
 * component here is mid-edit (e.g. tabbing through the structure-config
 * table) makes Next.js push a fresh server-rendered payload for the whole
 * route immediately, which can reset in-progress uncontrolled input state.
 * The client already has more precise state than a refetch would provide;
 * callers that need this page itself fresh call revalidatePath explicitly.
 */
async function revalidateDerivedViews() {
  const locale = await getLocale();
  revalidatePath(`/${locale}/matrice-status`);
  revalidatePath(`/${locale}/projects`);
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
    await revalidateDerivedViews();
    return { success: "itemSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getExecutionData(projectId: number): Promise<ProjectExecutionData | null> {
  const { supabase } = await requireAuth();
  const client = createSupabaseExecutionDataClient(supabase);
  return executionDataService.getExecutionData(client, projectId);
}

export async function upsertExecutionData(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseExecutionDataClient(supabase);

    const projectId = Number(formData.get("project_id"));
    if (!projectId) return { error: "errorGeneric" };

    const projectsClient = createSupabaseProjectsClient(supabase);
    let numar_persoane_alocate = intOrNull(formData.get("numar_persoane_alocate"));
    if (numar_persoane_alocate !== null) {
      const project = await projectService.getProjectById(projectsClient, projectId);
      const teamMemberCount = project?.team ? await getTeamMemberCount(supabase, project.team.id) : 0;
      numar_persoane_alocate = Math.min(Math.max(0, numar_persoane_alocate), teamMemberCount);
    }

    await executionDataService.upsertExecutionData(client, {
      projectId,
      site_responsible: (formData.get("site_responsible") as string | null) || null,
      diriginte_santier: (formData.get("diriginte_santier") as string | null) || null,
      rte: (formData.get("rte") as string | null) || null,
      buget_alocat_eur: floatOrNull(formData.get("buget_alocat_eur")),
      numar_persoane_alocate,
      zile_deadline: intOrNull(formData.get("zile_deadline")),
      zile_reale: intOrNull(formData.get("zile_reale")),
      updatedBy: user.id,
    });

    // Deliberately not revalidating this project's own page here: the
    // client (ProjectExecutionDataPanel) already re-fetches and displays the
    // saved value directly, and revalidating this route while other fields
    // in the same panel are mid-edit can reset their in-progress state.
    return { success: "executionDataSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getCefData(projectId: number): Promise<ProjectCefData | null> {
  const { supabase } = await requireAuth();
  const client = createSupabaseCefBessDataClient(supabase);
  return cefBessDataService.getCefData(client, projectId);
}

export async function upsertCefData(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseCefBessDataClient(supabase);

    const projectId = Number(formData.get("project_id"));
    if (!projectId) return { error: "errorGeneric" };

    await cefBessDataService.upsertCefData(client, {
      projectId,
      putere_instalata: floatOrNull(formData.get("putere_instalata")),
      putere_debitata: floatOrNull(formData.get("putere_debitata")),
      tip_panou: (formData.get("tip_panou") as string | null) || null,
      tip_invertor: (formData.get("tip_invertor") as string | null) || null,
      tip_structura: (formData.get("tip_structura") as string | null) || null,
      tip_gard: (formData.get("tip_gard") as string | null) || null,
      ridicare_topo: (formData.get("ridicare_topo") as string | null) || null,
      updatedBy: user.id,
    });

    return { success: "cefDataSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getBessData(projectId: number): Promise<ProjectBessData | null> {
  const { supabase } = await requireAuth();
  const client = createSupabaseCefBessDataClient(supabase);
  return cefBessDataService.getBessData(client, projectId);
}

export async function upsertBessData(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseCefBessDataClient(supabase);

    const projectId = Number(formData.get("project_id"));
    if (!projectId) return { error: "errorGeneric" };

    const incarcareRaw = formData.get("incarcare_din_retea");
    const incarcare_din_retea = incarcareRaw === "true" ? true : incarcareRaw === "false" ? false : null;

    await cefBessDataService.upsertBessData(client, {
      projectId,
      putere_instalata: floatOrNull(formData.get("putere_instalata")),
      putere_descarcare: floatOrNull(formData.get("putere_descarcare")),
      incarcare_din_retea,
      tip_bess: (formData.get("tip_bess") as string | null) || null,
      tip_pcs: (formData.get("tip_pcs") as string | null) || null,
      ridicare_topo: (formData.get("ridicare_topo") as string | null) || null,
      detalii_trafo: (formData.get("detalii_trafo") as string | null) || null,
      updatedBy: user.id,
    });

    return { success: "bessDataSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getStructureConfig(projectId: number): Promise<ProjectStructureConfigRow[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseExecutionDataClient(supabase);
  return executionDataService.getStructureConfig(client, projectId);
}

export type UpsertStructureConfigRowState = (ActionState & { id?: number }) | null;

export async function upsertStructureConfigRow(
  _prev: UpsertStructureConfigRowState,
  formData: FormData,
): Promise<UpsertStructureConfigRowState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseExecutionDataClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const structureType = (formData.get("structure_type") as string | null) || "";
    const mesaCount = intOrNull(formData.get("mesa_count"));
    if (!projectId || !structureType || mesaCount === null) return { error: "errorGeneric" };

    const id = intOrNull(formData.get("id"));

    const saved = await executionDataService.upsertStructureConfigRow(client, {
      ...(id !== null ? { id } : {}),
      projectId,
      structure_type: structureType,
      mesa_count: mesaCount,
      picior_per_mesa: intOrNull(formData.get("picior_per_mesa")),
      stalp_per_mesa: intOrNull(formData.get("stalp_per_mesa")),
      grinzi_per_mesa: intOrNull(formData.get("grinzi_per_mesa")),
      pane_per_mesa: intOrNull(formData.get("pane_per_mesa")),
      sort_order: intOrNull(formData.get("sort_order")) ?? 0,
    });

    await syncStructureTotalsToChecklist(client, projectId);

    await revalidateDerivedViews();
    return { success: "structureRowSaved", id: saved.id };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteStructureConfigRow(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseExecutionDataClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const id = Number(formData.get("id"));
    if (!projectId || !id) return { error: "errorGeneric" };

    await executionDataService.deleteStructureConfigRow(client, id);
    await syncStructureTotalsToChecklist(client, projectId);

    await revalidateDerivedViews();
    return { success: "structureRowDeleted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

/**
 * Recomputes structure totals (picior/stâlp/grinzi/pane) from every
 * project_structure_config row and pushes the derived counts into the
 * matching checklist rows' plan_total, so "Batere stâlpi" / "Montaj grinzi
 * longitudinale/verticale" / "Montaj pane" always reflect the structure
 * config instead of being typed in twice.
 */
async function syncStructureTotalsToChecklist(
  executionClient: ReturnType<typeof createSupabaseExecutionDataClient>,
  projectId: number,
) {
  const configRows = await executionDataService.getStructureConfig(executionClient, projectId);
  const totals = executionDataService.computeStructureTotals(configRows);
  const overrides = executionDataService.buildStructurePlanTotalOverrides(totals);

  const supabase = createAdminClient();
  const checklistClient = createSupabaseChecklistClient(supabase);
  const existingRecords = await checklistService.getChecklistRecords(checklistClient, projectId);
  const recordByNumber = new Map(existingRecords.map((r) => [r.item_number, r]));

  for (const { itemNumber, plan_total } of overrides) {
    const existing = recordByNumber.get(itemNumber);
    await checklistService.upsertChecklistItem(checklistClient, {
      projectId,
      itemNumber,
      plan_total,
      zile: existing?.zile ?? null,
      persons_allocated: existing?.persons_allocated ?? null,
      units_per_person_day: existing?.units_per_person_day ?? null,
      notes: existing?.notes ?? null,
    });
  }
}

function floatOrNull(raw: FormDataEntryValue | null): number | null {
  if (raw === null || raw === "") return null;
  const n = parseFloat(raw as string);
  return isNaN(n) ? null : n;
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
    await revalidateDerivedViews();
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

export async function getProjectFolderChildren(folderId: string) {
  await requireAuth();
  const { listFolderChildren } = await import("@/core/microsoft/folderProvider");
  return listFolderChildren(folderId);
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

export async function getActivitiesCatalog() {
  await requireAuth();
  const { getCachedActivities } = await import("@/features/matrice/services/matriceService");
  return getCachedActivities();
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
