"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import type { ProjectListParams, ProjectListResult, ProjectOption } from "@/features/projects/api/types";
import { createSupabaseContractsClient } from "@/features/projects/contracts/supabaseContractsClient";
import * as contractService from "@/features/projects/contracts/contractService";
import type { CreateContractPayload } from "@/features/projects/contracts/types";
import {
  createProjectFolder,
  grantProjectFolderAccess,
  listOneDriveFolderContents,
} from "@/core/microsoft/folderProvider";
import type { FolderItem } from "@/core/microsoft/folderProvider";
import type { Project, ProjectManager, ContractType } from "@/features/projects/types";
import {
  CONTRACT_TYPES,
  PROJECT_CATEGORIES,
  FINANCIAL_TYPES,
  EXECUTION_MODES,
  PROJECT_PHASES,
  PROJECT_STATUSES,
  ROMANIAN_COUNTIES,
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
import { getTodaysRate, getRateForDate } from "@/features/exchangeRates/services/exchangeRateService";
import { parseFormData } from "@/shared/utils/parseFormData";
import { createSupabaseCommsClient } from "@/features/comms/api/supabaseCommsClient";

export type ActionState = {
  error?: string;
  errorMessage?: string;
  success?: string;
  folderCreated?: boolean;
  projectId?: number;
  fieldErrors?: Record<string, string>;
} | null;

async function getProjectsPath() {
  const locale = await getLocale();
  return `/${locale}/projects`;
}

// notifications has no insert policy for regular users (writes come only
// from trigger functions or the service-role key — see
// 20260813000078_comms_rls.sql), so this must go through the admin client.
// Never let a notification failure block the project save it's attached to.
async function notifyProjectManagerAssigned(managerId: string, projectId: number, projectName: string) {
  try {
    const commsClient = createSupabaseCommsClient(createAdminClient());
    await commsClient.createNotification({
      profileId: managerId,
      type: "project_assigned",
      projectId,
      payload: { projectName },
      href: `/projects/${projectId}`,
    });
  } catch (e) {
    console.error("notifyProjectManagerAssigned failed:", e);
  }
}

/** Grants every current app user access to a newly created project folder. Best-effort — never blocks project/folder creation. */
async function grantFolderAccessToAllUsers(folderId: string) {
  try {
    const { data, error } = await createAdminClient().from("profiles").select("email");
    if (error) throw new Error(error.message);
    const emails = (data ?? []).map((row) => row.email).filter((email): email is string => Boolean(email));
    await grantProjectFolderAccess(folderId, emails);
  } catch (e) {
    console.error("grantFolderAccessToAllUsers failed:", e);
  }
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
  county: z.enum(ROMANIAN_COUNTIES),
  site_location: requiredTrimmed(),
  site_lat: requiredNumber({ min: -90, max: 90 }),
  site_lng: requiredNumber({ min: -180, max: 180 }),
  mw_solar: requiredNumber({ min: 0, max: 9999 }),
  mw_bess: requiredNumber({ min: 0, max: 9999 }),
  people_needed: optionalNumber({ min: 0 }),
  project_category: z.enum(PROJECT_CATEGORIES),
  financial_type: z.enum(FINANCIAL_TYPES),
  project_type: optionalTrimmed(),
  manager_id: optionalTrimmed(),
  sales_id: requiredTrimmed(),
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
    if (data.project_category !== "residential" && data.people_needed == null) {
      ctx.addIssue({ code: "custom", path: ["people_needed"], message: "People needed is required" });
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

// Quick-create path used from the situations centralizer's "add situation +
// new project" flow — only the fields needed to start a contract now, with
// everything else (county, coordinates, execution mode...) left null to be
// filled in later via the normal Edit project flow. Deliberately a separate
// schema from projectSchema rather than making its many required fields
// optional, since that would weaken validation for the full form too.
// Capacity/value are only shown in the dialog for residential contracts —
// industrial contracts fill them in later via the full Edit project flow —
// so those fields must tolerate being entirely absent from the FormData for
// industrial, but are required (via superRefine below) for residential.
const minimalProjectSchema = z.object({
  name: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(5)),
  client_id: requiredNumber({ min: 1 }),
  manager_id: requiredTrimmed(),
  contract_number: requiredTrimmed(),
  contract_date: optionalDate(),
  project_category: z.enum(PROJECT_CATEGORIES),
  mw_solar: optionalNumber({ min: 0, max: 9999 }),
  mw_bess: optionalNumber({ min: 0, max: 9999 }),
  value_amount: optionalNumber({ min: 0 }),
  currency: z.enum(["EUR", "RON"]).optional().default("EUR"),
}).superRefine((data, ctx) => {
  if (data.project_category === "residential") {
    if (data.mw_solar == null) {
      ctx.addIssue({ code: "custom", path: ["mw_solar"], message: "MW Solar is required" });
    }
    if (data.mw_bess == null) {
      ctx.addIssue({ code: "custom", path: ["mw_bess"], message: "MW BESS is required" });
    }
    if (data.value_amount == null) {
      ctx.addIssue({ code: "custom", path: ["value_amount"], message: "Value is required" });
    }
  }
});

function extractProjectPayload(
  data: z.infer<typeof projectSchema>,
  formData: FormData,
  existing: Project | undefined,
) {
  // paid_by is omitted from FormData entirely when its form control is
  // disabled/not rendered — fall back to the existing DB value instead of
  // sending null and clobbering it.
  const paid_by = formData.has("paid_by") ? data.paid_by : existing?.paid_by ?? null;

  return {
    name: data.name,
    county: data.county,
    site_location: data.site_location,
    site_lat: data.site_lat,
    site_lng: data.site_lng,
    mw_solar: data.mw_solar,
    mw_bess: data.mw_bess,
    people_needed: data.people_needed,
    project_category: data.project_category,
    financial_type: data.financial_type,
    project_type: data.project_category === "residential" ? null : data.project_type,
    manager_id: data.manager_id,
    sales_id: data.sales_id,
    client_id: data.client_id,
    execution_mode: data.execution_mode,
    current_phase: data.current_phase ?? existing?.current_phase ?? "planning",
    progress_pct: existing?.progress_pct ?? 0,
    deadline: data.deadline,
    status: data.status ?? existing?.status ?? "on_schedule",
    status_manual: data.status_manual,
    notes: data.notes,
    paid_by,
  };
}

/**
 * The project's PRIMARY contract's fields, extracted from the same form
 * submission — contract_number/date/value/currency/contract_type moved off
 * `projects` onto `contracts` (see supabase/migrations/20260908000127_
 * create_contracts.sql). The project form still shows exactly one set of
 * these fields (v1: every project gets one implicit contract on creation;
 * adding a second/later contract, e.g. a separate racordare contract, is a
 * follow-up UI not part of this change) — this just routes them to the
 * right table instead of the projects row.
 */
function extractContractPayload(
  data: z.infer<typeof projectSchema>,
  formData: FormData,
  existingContractType: ContractType[] | undefined,
  conversionRate: number | null,
): Omit<CreateContractPayload, "project_id"> {
  // Contract-type checkboxes are all-or-nothing on the form — if none were
  // submitted at all, fall back to the existing value instead of clobbering
  // it with an empty array.
  const hasAnyContractTypeField = CONTRACT_TYPES.some((c) => formData.has(`contract_type_${c}`));
  const contract_type = hasAnyContractTypeField
    ? CONTRACT_TYPES.filter((c) => formData.get(`contract_type_${c}`) === "true")
    : existingContractType ?? [];

  return {
    contract_number: data.contract_number,
    contract_date: data.contract_date,
    value_eur: data.currency === "EUR" ? data.value_amount : null,
    value_lei: data.currency === "RON" ? data.value_amount : null,
    currency: data.currency,
    conversion_rate: conversionRate,
    vat_rate: 21,
    contract_type,
    notes: null,
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
  // explicitly hit "refresh to today's rate". If no rate was ever pinned,
  // pin one now for the assignment's start date instead of leaving it null.
  const isNewRow = !currentAssignment || currentAssignment.subcontractor_id !== data.subcontractor_id;
  const explicitRefresh = formData.get("assignment_price_refresh_rate") === "true";
  const conversionRate = isNewRow || explicitRefresh
    ? (await getExchangeRate()) ?? currentAssignment?.conversion_rate ?? null
    : currentAssignment?.conversion_rate ?? (await getExchangeRateForDate(data.assignment_start_date ?? null));

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

export async function getProjectsByClientId(clientId: number): Promise<Project[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return projectService.getProjectsByClientId(client, clientId);
}

export async function searchProjectsAction(query: string): Promise<ProjectOption[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return client.searchProjects(query);
}

export async function grantUserProjectFolderAccess(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const projectId = Number(formData.get("projectId"));
    const email = formData.get("email") as string;

    const client = createSupabaseProjectsClient(supabase);
    const project = await client.getProjectById(projectId);
    if (!project?.onedrive_folder_id) return { error: "errorNoFolder" };

    await grantProjectFolderAccess(project.onedrive_folder_id, [email]);
    return { success: "accessGranted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getProjectManagers(): Promise<ProjectManager[]> {
  await requireAuth();
  return projectService.getCachedProjectManagers();
}

/** Today's EUR→RON reference rate for the "≈ converted amount" display, or
 * null if BNR's feed is unreachable and nothing has been cached yet. */
export async function getExchangeRate(): Promise<number | null> {
  try {
    const { supabase } = await requireAuth();
    const client = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(client);
    return rate?.eurRon ?? null;
  } catch (e: unknown) {
    console.error("getExchangeRate failed", e);
    return null;
  }
}

/** The EUR→RON rate for a given date (e.g. a contract or assignment date) if
 * BNR's feed already has that date cached, else today's rate — see
 * getRateForDate. Used to pin a real rate the first time a value is entered
 * on a record that was created before any rate existed for it, instead of
 * leaving conversion_rate null forever. */
async function getExchangeRateForDate(date: string | null): Promise<number | null> {
  try {
    const { supabase } = await requireAuth();
    const client = createSupabaseExchangeRatesClient(supabase);
    const rate = await getRateForDate(client, date);
    return rate?.eurRon ?? null;
  } catch (e: unknown) {
    console.error("getExchangeRateForDate failed", e);
    return null;
  }
}

export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const parsed = parseFormData(projectSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    // Contract-type checkboxes live outside the zod schema (extractProjectPayload
    // reads them straight from FormData) — at least one must be checked on
    // creation, except for residential contracts, which never render them.
    if (
      parsed.data.project_category !== "residential" &&
      !CONTRACT_TYPES.some((c) => formData.get(`contract_type_${c}`) === "true")
    ) {
      return { error: "errorValidation", fieldErrors: { contract_type: "invalid" } };
    }
    const client = createSupabaseProjectsClient(supabase);
    const contractsClient = createSupabaseContractsClient(supabase);
    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(exchangeRateClient);
    const payload = extractProjectPayload(parsed.data, formData, undefined);
    const { id: newId } = await projectService.createProject(client, payload, user.id);
    const contractPayload = extractContractPayload(parsed.data, formData, undefined, rate?.eurRon ?? null);
    await contractService.createContract(contractsClient, { ...contractPayload, project_id: newId });
    await upsertAssignmentIfSubcontracted(supabase, newId, parsed.data, formData);
    revalidatePath(await getProjectsPath());

    if (payload.manager_id && payload.manager_id !== user.id) {
      await notifyProjectManagerAssigned(payload.manager_id, newId, payload.name);
    }

    try {
      const folder = await createProjectFolder(payload.name, contractPayload.contract_number);
      await client.linkOneDriveFolder(newId, folder.id, folder.url, user.id);
      await grantFolderAccessToAllUsers(folder.id);
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

export async function createMinimalProjectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const parsed = parseFormData(minimalProjectSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    const {
      name,
      client_id,
      manager_id,
      contract_number,
      contract_date,
      project_category,
      mw_solar,
      mw_bess,
      value_amount,
      currency,
    } = parsed.data;

    const client = createSupabaseProjectsClient(supabase);
    const contractsClient = createSupabaseContractsClient(supabase);
    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = value_amount != null ? await getTodaysRate(exchangeRateClient) : null;
    const payload = {
      name,
      county: null,
      site_location: null,
      site_lat: null,
      site_lng: null,
      mw_solar,
      mw_bess,
      people_needed: null,
      project_category,
      financial_type: "proprii" as const,
      project_type: null,
      manager_id,
      sales_id: null,
      client_id,
      execution_mode: "internal" as const,
      current_phase: "planning",
      progress_pct: 0,
      deadline: null,
      status: "on_schedule",
      status_manual: false,
      notes: null,
      paid_by: null,
    };
    const { id: newId } = await projectService.createProject(client, payload, user.id);
    await contractService.createContract(contractsClient, {
      project_id: newId,
      contract_number,
      contract_date,
      value_eur: currency === "EUR" ? value_amount : null,
      value_lei: currency === "RON" ? value_amount : null,
      currency,
      conversion_rate: value_amount != null ? rate?.eurRon ?? null : null,
      vat_rate: 21,
      contract_type: [],
      notes: null,
    });
    revalidatePath(await getProjectsPath());

    if (manager_id && manager_id !== user.id) {
      await notifyProjectManagerAssigned(manager_id, newId, name);
    }

    try {
      const folder = await createProjectFolder(payload.name, contract_number);
      await client.linkOneDriveFolder(newId, folder.id, folder.url, user.id);
      await grantFolderAccessToAllUsers(folder.id);
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

export async function ensureProjectFolder(projectId: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseProjectsClient(supabase);

    const project = await client.getProjectById(projectId);
    if (!project) return { error: "errorGeneric" };
    if (project.onedrive_folder_id) return { success: "folderLinked" };

    const folder = await createProjectFolder(project.name, project.contract_number);
    await client.linkOneDriveFolder(projectId, folder.id, folder.url, user.id);
    await grantFolderAccessToAllUsers(folder.id);

    const locale = await getLocale();
    revalidatePath(`/${locale}/projects/${projectId}`);
    return { success: "folderLinked" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "folderLinkError" };
  }
}

export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const parsed = parseFormData(projectSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };
    const client = createSupabaseProjectsClient(supabase);
    const contractsClient = createSupabaseContractsClient(supabase);
    const projectId = Number(formData.get("projectId"));
    const existing = await projectService.getProjectById(client, projectId);
    // conversion_rate stays frozen on edit unless the user explicitly hit
    // "refresh to today's rate" (CurrencyAmountInput's hidden flag). If no
    // rate was ever pinned (e.g. a quick-created contract that had no value
    // yet), pin one now for the contract date instead of leaving it null.
    const conversionRate = formData.get("value_amount_refresh_rate") === "true"
      ? (await getExchangeRate()) ?? existing?.conversion_rate ?? null
      : existing?.conversion_rate ?? (await getExchangeRateForDate(existing?.contract_date ?? null));
    const payload = extractProjectPayload(parsed.data, formData, existing ?? undefined);
    await projectService.updateProject(client, projectId, payload, user.id);

    // The form still edits one implicit "primary" contract per project (see
    // extractContractPayload) — find it (existing.contract_* is already that
    // contract's passthrough data) and update it in place, or create one if
    // this project somehow has none yet.
    const existingContracts = await contractService.getContractsForProject(contractsClient, projectId);
    const primaryContract = existingContracts[0];
    const contractPayload = extractContractPayload(parsed.data, formData, existing?.contract_type, conversionRate);
    if (primaryContract) {
      await contractService.updateContract(contractsClient, primaryContract.id, contractPayload);
    } else {
      await contractService.createContract(contractsClient, { ...contractPayload, project_id: projectId });
    }

    await upsertAssignmentIfSubcontracted(supabase, projectId, parsed.data, formData);

    if (payload.manager_id && payload.manager_id !== existing?.manager_id && payload.manager_id !== user.id) {
      await notifyProjectManagerAssigned(payload.manager_id, projectId, payload.name);
    }

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

// --- Contract management (a project's "Contract & Financials" section can
// now hold several contracts — e.g. a proiectare+executie contract signed
// now, a separate racordare contract signed later — see the `contracts`
// table, supabase/migrations/20260908000127_create_contracts.sql) ---

const contractFormSchema = z.object({
  contract_number: optionalTrimmed(),
  contract_date: optionalDate(),
  value_amount: optionalNumber({ min: 0 }),
  currency: z.enum(["EUR", "RON"]),
});

export type ContractActionState = {
  error?: string;
  errorMessage?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function getProjectContracts(projectId: number) {
  const { supabase } = await requireAuth();
  const contractsApi = createSupabaseContractsClient(supabase);
  return contractService.getContractsForProject(contractsApi, projectId);
}

/** Suggested next contract number for "Add contract" on an existing
 * project — same global (system-wide, not project-scoped) counter already
 * used when creating a brand-new project, see suggestNextContractNumber(). */
export async function getNextContractNumberSuggestion(): Promise<string> {
  const { supabase } = await requireAuth();
  const contractsApi = createSupabaseContractsClient(supabase);
  const contracts = await contractService.getAllContractNumbers(contractsApi);
  return contractService.suggestNextContractNumber(contracts);
}

async function getProjectContractsPath(projectId: number) {
  const locale = await getLocale();
  return `/${locale}/projects/${projectId}`;
}

export async function createContractForProjectAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  try {
    const { supabase } = await requireMutator();
    const parsed = parseFormData(contractFormSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

    const projectId = Number(formData.get("project_id"));
    if (!projectId) return { error: "errorGeneric" };

    const contract_type = CONTRACT_TYPES.filter((c) => formData.get(`contract_type_${c}`) === "true");
    if (contract_type.length === 0) {
      return { error: "errorValidation", fieldErrors: { contract_type: "invalid" } };
    }

    const { contract_number, contract_date, value_amount, currency } = parsed.data;
    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = value_amount != null ? await getTodaysRate(exchangeRateClient) : null;

    const contractsApi = createSupabaseContractsClient(supabase);
    const payload: CreateContractPayload = {
      project_id: projectId,
      contract_number,
      contract_date,
      value_eur: currency === "EUR" ? value_amount : null,
      value_lei: currency === "RON" ? value_amount : null,
      currency,
      conversion_rate: value_amount != null ? rate?.eurRon ?? null : null,
      vat_rate: 21,
      contract_type,
      notes: null,
    };
    await contractService.createContract(contractsApi, payload);

    revalidatePath(await getProjectContractsPath(projectId));
    return { success: "contractCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    // Unique-violation on contract_claimed_types_exclusive_idx (see
    // 20260908000127_create_contracts.sql) — a contract_type in this
    // submission is already claimed by another contract on this project.
    if (e instanceof Error && e.message.includes("contract_claimed_types_exclusive_idx")) {
      return { error: "errorContractTypeClaimed" };
    }
    return { error: "errorGeneric" };
  }
}

export async function updateContractForProjectAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  try {
    const { supabase } = await requireMutator();
    const parsed = parseFormData(contractFormSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

    const contractId = Number(formData.get("contract_id"));
    const projectId = Number(formData.get("project_id"));
    if (!contractId || !projectId) return { error: "errorGeneric" };

    const contract_type = CONTRACT_TYPES.filter((c) => formData.get(`contract_type_${c}`) === "true");
    if (contract_type.length === 0) {
      return { error: "errorValidation", fieldErrors: { contract_type: "invalid" } };
    }

    const contractsApi = createSupabaseContractsClient(supabase);
    const existing = await contractService.getContractById(contractsApi, contractId);
    if (!existing) return { error: "errorGeneric" };

    const { contract_number, contract_date, value_amount, currency } = parsed.data;
    const refreshRate = formData.get("value_amount_refresh_rate") === "true";
    const conversionRate = refreshRate
      ? (await getExchangeRate()) ?? existing.conversion_rate
      : existing.conversion_rate ?? (await getExchangeRateForDate(contract_date));

    await contractService.updateContract(contractsApi, contractId, {
      contract_number,
      contract_date,
      value_eur: currency === "EUR" ? value_amount : null,
      value_lei: currency === "RON" ? value_amount : null,
      currency,
      conversion_rate: conversionRate,
      contract_type,
    });

    revalidatePath(await getProjectContractsPath(projectId));
    return { success: "contractSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    if (e instanceof Error && e.message.includes("contract_claimed_types_exclusive_idx")) {
      return { error: "errorContractTypeClaimed" };
    }
    return { error: "errorGeneric" };
  }
}

export async function deleteContractForProjectAction(contractId: number, projectId: number): Promise<ContractActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const contractsApi = createSupabaseContractsClient(supabase);
    await contractService.deleteContract(contractsApi, contractId);
    revalidatePath(await getProjectContractsPath(projectId));
    return { success: "contractDeleted" };
  } catch (e: unknown) {
    // situations.contract_id references contracts(id) on delete restrict
    // (20260908000128_situations_contract_id.sql) — a contract with billed
    // situations against it can't be deleted.
    if (e instanceof Error && e.message.toLowerCase().includes("foreign key")) {
      return { error: "errorContractHasSituations" };
    }
    return { error: "errorGeneric" };
  }
}
