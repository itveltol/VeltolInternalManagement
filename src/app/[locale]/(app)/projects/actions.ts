"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import { createProjectFolder, listOneDriveFolderContents } from "@/core/microsoft/folderProvider";
import type { FolderItem } from "@/core/microsoft/folderProvider";
import type { Project, ProjectManager, ProjectCategory, FinancialType, ExecutionMode, Currency } from "@/features/projects/types";
import { CONTRACT_TYPES } from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";
import { createSupabaseClientsClient } from "@/features/clients/api/supabaseClientsClient";
import * as clientService from "@/features/clients/services/clientService";
import type { SubcontractorRef, ProjectSubcontractorAssignment } from "@/features/subcontractors/types";
import { createSupabaseSubcontractorsClient } from "@/features/subcontractors/api/supabaseSubcontractorsClient";
import * as subcontractorService from "@/features/subcontractors/services/subcontractorService";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import { createSupabaseMatriceClient } from "@/features/matrice/api/supabaseMatriceClient";
import * as matriceService from "@/features/matrice/services/matriceService";
import { buildDerivedActivityIds } from "@/features/matrice/services/checklistActivityMapping";
import type { ActivityStatus } from "@/features/matrice/types";
import { createSupabaseExchangeRatesClient } from "@/features/exchangeRates/api/supabaseExchangeRatesClient";
import { getTodaysRate } from "@/features/exchangeRates/services/exchangeRateService";

export type ActionState = {
  error?: string;
  errorMessage?: string;
  success?: string;
  folderCreated?: boolean;
  projectId?: number;
} | null;

async function getProjectsPath() {
  const locale = await getLocale();
  return `/${locale}/projects`;
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

/** Only an admin or the project's own manager may reassign its team. */
async function requireProjectOwner(projectId: number) {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (role === "admin") return { supabase, user };
  const client = createSupabaseProjectsClient(supabase);
  const project = await projectService.getProjectById(client, projectId);
  if (!project || project.manager_id !== user.id) throw new Error("Forbidden");
  return { supabase, user };
}

function extractProjectPayload(formData: FormData, existing: Project | undefined, conversionRate: number | null) {
  const str = (key: string) => {
    const v = formData.get(key) as string | null;
    return v && v.trim() !== "" ? v.trim() : null;
  };
  const num = (key: string) => {
    const v = formData.get(key) as string | null;
    if (!v || v.trim() === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };
  // Disabled form controls (e.g. status/progress in "auto" mode) are omitted
  // from FormData entirely — fall back to the existing DB value instead of
  // sending null/blank and clobbering it.
  const strOrExisting = (key: string, fallback: string | null) => formData.has(key) ? str(key) : fallback;

  const project_category: ProjectCategory =
    formData.get("project_category") === "residential" ? "residential" : "industrial";

  const financial_type: FinancialType =
    formData.get("financial_type") === "finantare" ? "finantare" : "proprii";

  // Contract-type checkboxes are all-or-nothing on the form — if none were
  // submitted at all, fall back to the existing value instead of clobbering
  // it with an empty array.
  const hasAnyContractTypeField = CONTRACT_TYPES.some((c) => formData.has(`contract_type_${c}`));
  const contract_type = hasAnyContractTypeField
    ? CONTRACT_TYPES.filter((c) => formData.get(`contract_type_${c}`) === "true")
    : existing?.contract_type ?? [];

  const execution_mode: ExecutionMode =
    formData.get("execution_mode") === "subcontracted" ? "subcontracted" : "internal";

  // The form only exposes a single amount + currency toggle; route it into
  // whichever of value_eur/value_lei matches the chosen currency so the
  // other stays null rather than holding a stale manually-entered value.
  const currency: Currency = formData.get("currency") === "RON" ? "RON" : "EUR";
  const value_amount = num("value_amount");

  return {
    name: (formData.get("name") as string).trim(),
    county: str("county"),
    site_location: str("site_location"),
    site_lat: num("site_lat"),
    site_lng: num("site_lng"),
    mw_solar: num("mw_solar"),
    mw_bess: num("mw_bess"),
    project_category,
    financial_type,
    project_type: project_category === "residential" ? null : str("project_type"),
    contract_type,
    manager_id: str("manager_id"),
    client_id: num("client_id"),
    execution_mode,
    current_phase: (formData.get("current_phase") as string | null) ?? existing?.current_phase ?? "",
    progress_pct: existing?.progress_pct ?? 0,
    contract_number: str("contract_number"),
    contract_date: str("contract_date"),
    deadline: str("deadline"),
    value_eur: currency === "EUR" ? value_amount : null,
    value_lei: currency === "RON" ? value_amount : null,
    currency,
    conversion_rate: conversionRate,
    status: (formData.get("status") as string | null) ?? existing?.status ?? "on_schedule",
    status_manual: formData.get("status_manual") === "true",
    notes: str("notes"),
    paid_by: strOrExisting("paid_by", existing?.paid_by ?? null),
  };
}

/**
 * Kept entirely separate from extractProjectPayload/createProject/updateProject's
 * own writes so a bug in one can never silently blank fields owned by the
 * other (see 20260730000047_backfill_subcontracted_contract_type.sql for the
 * class of data-loss bug this structure avoids). Only touches
 * project_subcontractors, and only when the subcontracted branch was actually
 * rendered and submitted with a subcontractor picked.
 */
function extractAssignmentPayload(formData: FormData, conversionRate: number | null) {
  const subcontractorId = Number(formData.get("subcontractor_id"));
  if (!formData.has("subcontractor_id") || !subcontractorId) return null;

  const str = (key: string) => {
    const v = formData.get(key) as string | null;
    return v && v.trim() !== "" ? v.trim() : null;
  };
  const num = (key: string) => {
    const v = formData.get(key) as string | null;
    if (!v || v.trim() === "") return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const currency = formData.get("assignment_currency") === "RON" ? "RON" as const : "EUR" as const;
  const price_amount = num("assignment_price");

  return {
    subcontractor_id: subcontractorId,
    price_eur: currency === "EUR" ? price_amount : null,
    price_lei: currency === "RON" ? price_amount : null,
    currency,
    conversion_rate: conversionRate,
    start_date: str("assignment_start_date"),
    deadline: str("assignment_deadline"),
    notes: str("assignment_notes"),
  };
}

async function upsertAssignmentIfSubcontracted(
  supabase: SupabaseClient,
  projectId: number,
  formData: FormData,
): Promise<void> {
  if (formData.get("execution_mode") !== "subcontracted") return;
  const api = createSupabaseSubcontractorsClient(supabase);
  const currentAssignment = await subcontractorService.getCurrentAssignment(api, projectId);

  // A genuinely new assignment row (new project, or reassignment to a
  // different subcontractor) always locks in today's rate. An in-place edit
  // of the existing assignment keeps its own rate frozen unless the user
  // explicitly hit "refresh to today's rate".
  const subcontractorId = Number(formData.get("subcontractor_id"));
  const isNewRow = !currentAssignment || currentAssignment.subcontractor_id !== subcontractorId;
  const explicitRefresh = formData.get("assignment_price_refresh_rate") === "true";
  const conversionRate = isNewRow || explicitRefresh
    ? (await getExchangeRate()) ?? currentAssignment?.conversion_rate ?? null
    : currentAssignment?.conversion_rate ?? null;

  const assignmentPayload = extractAssignmentPayload(formData, conversionRate);
  if (!assignmentPayload) return;
  await subcontractorService.upsertCurrentAssignment(api, projectId, assignmentPayload);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "User-Agent": "VeltolInternalManagement/1.0" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export async function getProjects(): Promise<Project[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjects(client);
}

export async function getProjectManagers(): Promise<ProjectManager[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjectManagers(client);
}

/** Today's EUR→RON reference rate for the "≈ converted amount" display, or
 * null if BNR's feed is unreachable and nothing has been cached yet. */
export async function getExchangeRate(): Promise<number | null> {
  const { supabase } = await requireAuth();
  const client = createSupabaseExchangeRatesClient(supabase);
  const rate = await getTodaysRate(client);
  return rate?.eurRon ?? null;
}

export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);
    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(exchangeRateClient);
    const payload = extractProjectPayload(formData, undefined, rate?.eurRon ?? null);
    const { id: newId } = await projectService.createProject(client, payload, user.id);
    await upsertAssignmentIfSubcontracted(supabase, newId, formData);
    revalidatePath(await getProjectsPath());

    try {
      const folder = await createProjectFolder(payload.name, payload.contract_number);
      await client.linkOneDriveFolder(newId, folder.id, folder.url, user.id);
      return { success: "projectCreated", folderCreated: true, projectId: newId };
    } catch {
      return { success: "projectCreated", folderCreated: false, projectId: newId };
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function linkProjectFolder(
  projectId: number,
  input: string,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);

    let folderId: string;
    let folderUrl: string;

    if (process.env.AZURE_CLIENT_ID) {
      // OneDrive: resolve share URL to a drive item
      const encoded = Buffer.from(input).toString("base64url");
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/shares/u!${encoded}/driveItem`,
        { headers: { Authorization: `Bearer ` } }, // token would be fetched via getGraphToken in full impl
      );
      if (!res.ok) return { error: "folderLinkError" };
      const item = (await res.json()) as { id: string; webUrl: string };
      folderId = item.id;
      folderUrl = item.webUrl;
    } else {
      // Local stub: treat input as an absolute path
      const { stat } = await import("fs/promises");
      try {
        await stat(input);
      } catch {
        return { error: "folderLinkError" };
      }
      folderId = input.split("/").pop() ?? input;
      folderUrl = input;
    }

    await client.linkOneDriveFolder(projectId, folderId, folderUrl, user.id);
    const locale = await getLocale();
    revalidatePath(`/${locale}/projects/${projectId}`);
    return { success: "folderLinked" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);
    const projectId = Number(formData.get("projectId"));
    const existing = await projectService.getProjectById(client, projectId);
    // conversion_rate stays frozen on edit unless the user explicitly hit
    // "refresh to today's rate" (CurrencyAmountInput's hidden flag).
    const conversionRate = formData.get("value_amount_refresh_rate") === "true"
      ? (await getExchangeRate()) ?? existing?.conversion_rate ?? null
      : existing?.conversion_rate ?? null;
    const payload = extractProjectPayload(formData, existing ?? undefined, conversionRate);
    await projectService.updateProject(client, projectId, payload, user.id);
    await upsertAssignmentIfSubcontracted(supabase, projectId, formData);
    const locale = await getLocale();
    revalidatePath(await getProjectsPath());
    revalidatePath(`/${locale}/projects/${projectId}`);
    return { success: "projectSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    if (e instanceof Error && e.message) return { error: "errorDetail", errorMessage: e.message };
    return { error: "errorGeneric" };
  }
}

export async function deleteProject(projectId: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const client = createSupabaseProjectsClient(supabase);
    await projectService.deleteProject(client, projectId);
    revalidatePath(await getProjectsPath());
    return { success: "projectDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function getClientRefs(): Promise<ClientRef[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseClientsClient(supabase);
  return clientService.getClientRefs(api);
}

export async function getSubcontractorRefs(): Promise<SubcontractorRef[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSubcontractorsClient(supabase);
  return subcontractorService.getSubcontractorRefs(api);
}

export async function getSubcontractorAssignment(projectId: number): Promise<ProjectSubcontractorAssignment | null> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSubcontractorsClient(supabase);
  return subcontractorService.getCurrentAssignment(api, projectId);
}

export async function assignProjectTeam(projectId: number, teamId: number | null): Promise<ActionState> {
  try {
    const { supabase, user } = await requireProjectOwner(projectId);
    const client = createSupabaseProjectsClient(supabase);
    await projectService.updateProjectTeam(client, projectId, teamId, user.id);
    const locale = await getLocale();
    revalidatePath(await getProjectsPath());
    revalidatePath(`/${locale}/projects/${projectId}`);
    revalidatePath(`/${locale}/gantt`);
    return { success: "teamAssigned" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function scanProjectFolder(
  projectId: number,
): Promise<{ files: FolderItem[]; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const client = createSupabaseProjectsClient(supabase);
    const project = await projectService.getProjectById(client, projectId);
    if (!project?.onedrive_folder_id) {
      return { files: [], error: "noFolderLinked" };
    }
    const files = await listOneDriveFolderContents(project.onedrive_folder_id);
    return { files };
  } catch {
    return { files: [], error: "errorGeneric" };
  }
}

export async function applyFolderScanSuggestions(
  projectId: number,
  checklistUpdates: Array<{ itemNumber: number; plan_total: number }>,
  matriceUpdates: Array<{ activityId: number; status: ActivityStatus }>,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const checklistClient = createSupabaseChecklistClient(supabase);
    const matriceClient = createSupabaseMatriceClient(supabase);

    for (const { itemNumber, plan_total } of checklistUpdates) {
      await checklistClient.upsertChecklistItem({
        projectId,
        itemNumber,
        plan_total,
        zile: null,
        notes: null,
      });
    }

    // Mapped activities (phase_no 9/10 items also tracked in the checklist)
    // are driven by checklist progress via a DB trigger — a folder-scan
    // suggestion for one of these would just be silently overwritten on the
    // next checklist edit, so skip them here rather than apply-then-clobber.
    const activities = await matriceClient.getActivities();
    const derivedActivityIds = buildDerivedActivityIds(activities);
    for (const { activityId, status } of matriceUpdates) {
      if (derivedActivityIds.has(activityId)) continue;
      await matriceService.setCellStatus(matriceClient, projectId, activityId, status, user.id);
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}/projects/${projectId}`);
    revalidatePath(`/${locale}/matrice-status`);
    return { success: "scanApplied" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
