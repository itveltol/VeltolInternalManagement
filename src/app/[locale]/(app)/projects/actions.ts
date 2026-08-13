"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import type { ProjectListParams, ProjectListResult } from "@/features/projects/api/types";
import { createProjectFolder, listOneDriveFolderContents } from "@/core/microsoft/folderProvider";
import type { FolderItem } from "@/core/microsoft/folderProvider";
import { getGraphToken } from "@/core/microsoft/graph";
import type { Project, ProjectManager } from "@/features/projects/types";
import {
  CONTRACT_TYPES,
  PROJECT_CATEGORIES,
  FINANCIAL_TYPES,
  EXECUTION_MODES,
  PROJECT_PHASES,
  PROJECT_STATUSES,
} from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";
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
import { parseFormData } from "@/shared/utils/parseFormData";

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

const optionalTrimmed = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().nullable(),
  );

const optionalNumber = (opts?: { min?: number; max?: number }) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return null;
      const n = Number(v);
      return isNaN(n) ? v : n;
    },
    z.number().min(opts?.min ?? -Infinity).max(opts?.max ?? Infinity).nullable(),
  );

const optionalDate = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.iso.date().nullable(),
  );

// Same trim-preprocessing as optionalTrimmed(), but blank input is rejected
// instead of coerced to null.
const requiredTrimmed = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1),
  );

// Same numeric coercion as optionalNumber(), but blank input is rejected
// instead of coerced to null.
const requiredNumber = (opts?: { min?: number; max?: number }) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string" || v.trim() === "") return v;
      const n = Number(v);
      return isNaN(n) ? v : n;
    },
    z.number().min(opts?.min ?? -Infinity).max(opts?.max ?? Infinity),
  );

// Kept in sync with the (form) checkbox group; contract-type presence/fallback
// logic still lives in extractProjectPayload since it depends on `existing`,
// which the schema has no access to. Only `notes`, plus a handful of fields
// whose requiredness depends on execution_mode/project_category (validated
// below via superRefine), are allowed to be blank.
const projectSchema = z.object({
  name: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(5)),
  county: requiredTrimmed(),
  site_location: requiredTrimmed(),
  site_lat: requiredNumber({ min: -90, max: 90 }),
  site_lng: requiredNumber({ min: -180, max: 180 }),
  mw_solar: requiredNumber({ min: 0, max: 9999 }),
  mw_bess: requiredNumber({ min: 0, max: 9999 }),
  project_category: z.enum(PROJECT_CATEGORIES),
  financial_type: z.enum(FINANCIAL_TYPES),
  project_type: optionalTrimmed(),
  manager_id: optionalTrimmed(),
  client_id: requiredNumber({ min: 1 }),
  execution_mode: z.enum(EXECUTION_MODES),
  current_phase: z.enum(PROJECT_PHASES).optional(),
  contract_number: optionalTrimmed(),
  contract_date: optionalDate(),
  deadline: optionalDate(),
  value_amount: requiredNumber({ min: 0 }),
  currency: z.enum(["EUR", "RON"]),
  status: z.enum(PROJECT_STATUSES).optional(),
  status_manual: z.preprocess((v) => v === "true", z.boolean()),
  notes: optionalTrimmed(),
  paid_by: optionalTrimmed(),
  subcontractor_id: optionalNumber({ min: 1 }),
  assignment_price: optionalNumber({ min: 0 }),
  assignment_start_date: optionalDate(),
  assignment_deadline: optionalDate(),
}).superRefine((data, ctx) => {
  if (data.execution_mode === "internal") {
    if (!data.manager_id) {
      ctx.addIssue({ code: "custom", path: ["manager_id"], message: "Manager is required" });
    }
    if (!data.deadline) {
      ctx.addIssue({ code: "custom", path: ["deadline"], message: "Deadline is required" });
    }
    if (!data.contract_number) {
      ctx.addIssue({ code: "custom", path: ["contract_number"], message: "Contract number is required" });
    }
    if (!data.contract_date) {
      ctx.addIssue({ code: "custom", path: ["contract_date"], message: "Contract date is required" });
    }
    if (data.contract_date && data.deadline && data.deadline < data.contract_date) {
      ctx.addIssue({ code: "custom", path: ["deadline"], message: "Deadline must be on or after the contract date" });
    }
  }

  if (data.execution_mode === "subcontracted") {
    if (data.subcontractor_id == null) {
      ctx.addIssue({ code: "custom", path: ["subcontractor_id"], message: "Subcontractor is required" });
    }
    if (data.assignment_price == null) {
      ctx.addIssue({ code: "custom", path: ["assignment_price"], message: "Subcontractor price is required" });
    }
    if (!data.assignment_start_date) {
      ctx.addIssue({ code: "custom", path: ["assignment_start_date"], message: "Subcontractor start date is required" });
    }
    if (!data.assignment_deadline) {
      ctx.addIssue({ code: "custom", path: ["assignment_deadline"], message: "Subcontractor deadline is required" });
    }
  }

  if (data.project_category === "industrial" && !data.project_type) {
    ctx.addIssue({ code: "custom", path: ["project_type"], message: "Technical type is required" });
  }
});

function extractProjectPayload(
  data: z.infer<typeof projectSchema>,
  formData: FormData,
  existing: Project | undefined,
  conversionRate: number | null,
) {
  // paid_by is omitted from FormData entirely when its form control is
  // disabled/not rendered — fall back to the existing DB value instead of
  // sending null and clobbering it.
  const paid_by = formData.has("paid_by") ? data.paid_by : existing?.paid_by ?? null;

  // Contract-type checkboxes are all-or-nothing on the form — if none were
  // submitted at all, fall back to the existing value instead of clobbering
  // it with an empty array.
  const hasAnyContractTypeField = CONTRACT_TYPES.some((c) => formData.has(`contract_type_${c}`));
  const contract_type = hasAnyContractTypeField
    ? CONTRACT_TYPES.filter((c) => formData.get(`contract_type_${c}`) === "true")
    : existing?.contract_type ?? [];

  return {
    name: data.name,
    county: data.county,
    site_location: data.site_location,
    site_lat: data.site_lat,
    site_lng: data.site_lng,
    mw_solar: data.mw_solar,
    mw_bess: data.mw_bess,
    project_category: data.project_category,
    financial_type: data.financial_type,
    project_type: data.project_category === "residential" ? null : data.project_type,
    contract_type,
    manager_id: data.manager_id,
    client_id: data.client_id,
    execution_mode: data.execution_mode,
    current_phase: data.current_phase ?? existing?.current_phase ?? "planning",
    progress_pct: existing?.progress_pct ?? 0,
    contract_number: data.contract_number,
    contract_date: data.contract_date,
    deadline: data.deadline,
    value_eur: data.currency === "EUR" ? data.value_amount : null,
    value_lei: data.currency === "RON" ? data.value_amount : null,
    currency: data.currency,
    conversion_rate: conversionRate,
    status: data.status ?? existing?.status ?? "on_schedule",
    status_manual: data.status_manual,
    notes: data.notes,
    paid_by,
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
function extractAssignmentPayload(
  data: z.infer<typeof projectSchema>,
  formData: FormData,
  conversionRate: number | null,
) {
  if (data.execution_mode !== "subcontracted" || data.subcontractor_id == null) return null;

  const str = (key: string) => {
    const v = formData.get(key) as string | null;
    return v && v.trim() !== "" ? v.trim() : null;
  };

  const currency = formData.get("assignment_currency") === "RON" ? "RON" as const : "EUR" as const;
  const price_amount = data.assignment_price;

  return {
    subcontractor_id: data.subcontractor_id,
    price_eur: currency === "EUR" ? price_amount : null,
    price_lei: currency === "RON" ? price_amount : null,
    currency,
    conversion_rate: conversionRate,
    start_date: data.assignment_start_date,
    deadline: data.assignment_deadline,
    notes: str("assignment_notes"),
  };
}

async function upsertAssignmentIfSubcontracted(
  supabase: SupabaseClient,
  projectId: number,
  data: z.infer<typeof projectSchema>,
  formData: FormData,
): Promise<void> {
  if (data.execution_mode !== "subcontracted" || data.subcontractor_id == null) return;
  const api = createSupabaseSubcontractorsClient(supabase);
  const currentAssignment = await subcontractorService.getCurrentAssignment(api, projectId);

  // A genuinely new assignment row (new project, or reassignment to a
  // different subcontractor) always locks in today's rate. An in-place edit
  // of the existing assignment keeps its own rate frozen unless the user
  // explicitly hit "refresh to today's rate".
  const isNewRow = !currentAssignment || currentAssignment.subcontractor_id !== data.subcontractor_id;
  const explicitRefresh = formData.get("assignment_price_refresh_rate") === "true";
  const conversionRate = isNewRow || explicitRefresh
    ? (await getExchangeRate()) ?? currentAssignment?.conversion_rate ?? null
    : currentAssignment?.conversion_rate ?? null;

  const assignmentPayload = extractAssignmentPayload(data, formData, conversionRate);
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

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ro&limit=6&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "VeltolInternalManagement/1.0" } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }));
  } catch {
    return [];
  }
}

export async function getProjectsPage(params: ProjectListParams): Promise<ProjectListResult> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjectsPage(client, params);
}

export async function getProjectManagers(): Promise<ProjectManager[]> {
  await requireAuth();
  return projectService.getCachedProjectManagers();
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
    const parsed = parseFormData(projectSchema, formData);
    if (!parsed.success) return { error: parsed.error };
    const client = createSupabaseProjectsClient(supabase);
    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(exchangeRateClient);
    const payload = extractProjectPayload(parsed.data, formData, undefined, rate?.eurRon ?? null);
    const { id: newId } = await projectService.createProject(client, payload, user.id);
    await upsertAssignmentIfSubcontracted(supabase, newId, parsed.data, formData);
    revalidatePath(await getProjectsPath());

    try {
      const folder = await createProjectFolder(payload.name, payload.contract_number);
      await client.linkOneDriveFolder(newId, folder.id, folder.url, user.id);
      return { success: "projectCreated", folderCreated: true, projectId: newId };
    } catch (folderError) {
      console.error("createProjectFolder failed:", folderError);
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
      const token = await getGraphToken();
      const encoded = Buffer.from(input).toString("base64url");
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/shares/u!${encoded}/driveItem`,
        { headers: { Authorization: `Bearer ${token}` } },
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
    const parsed = parseFormData(projectSchema, formData);
    if (!parsed.success) return { error: parsed.error };
    const client = createSupabaseProjectsClient(supabase);
    const projectId = Number(formData.get("projectId"));
    const existing = await projectService.getProjectById(client, projectId);
    // conversion_rate stays frozen on edit unless the user explicitly hit
    // "refresh to today's rate" (CurrencyAmountInput's hidden flag).
    const conversionRate = formData.get("value_amount_refresh_rate") === "true"
      ? (await getExchangeRate()) ?? existing?.conversion_rate ?? null
      : existing?.conversion_rate ?? null;
    const payload = extractProjectPayload(parsed.data, formData, existing ?? undefined, conversionRate);
    await projectService.updateProject(client, projectId, payload, user.id);
    await upsertAssignmentIfSubcontracted(supabase, projectId, parsed.data, formData);
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
        persons_allocated: null,
        units_per_person_day: null,
        notes: null,
      });
    }

    // Mapped activities (phase_no 9/10 items also tracked in the checklist)
    // are driven by checklist progress via a DB trigger — a folder-scan
    // suggestion for one of these would just be silently overwritten on the
    // next checklist edit, so skip them here rather than apply-then-clobber.
    const activities = await matriceService.getCachedActivities();
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
