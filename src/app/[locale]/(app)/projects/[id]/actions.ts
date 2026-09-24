"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseChecklistClient } from "@/features/projects/checklists/api/supabaseChecklistClient";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import { createSupabaseMaintenanceClient } from "@/features/projects/maintenance/api/supabaseMaintenanceClient";
import { createSupabaseExecutionDataClient } from "@/features/projects/executionData/api/supabaseExecutionDataClient";
import { createSupabaseCefBessDataClient } from "@/features/projects/cefBessData/api/supabaseCefBessDataClient";
import * as checklistService from "@/features/projects/checklists/services/checklistService";
import * as projectService from "@/features/projects/services/projectService";
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
      const peopleNeeded = project?.people_needed ?? 0;
      persons_allocated = Math.min(Math.max(0, persons_allocated), peopleNeeded);
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
      const peopleNeeded = project?.people_needed ?? 0;
      numar_persoane_alocate = Math.min(Math.max(0, numar_persoane_alocate), peopleNeeded);
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

    revalidatePath(await getChecklistPath(projectId));
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

    revalidatePath(await getChecklistPath(projectId));
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

const CONTRACT_FILL_FIELDS = [
  "name",
  "county",
  "site_location",
  "project_type",
  "mw_solar",
  "mw_bess",
  "contract_type",
  "contract_number",
  "contract_date",
  "deadline",
  "value_amount",
  "currency",
  "notes",
];

const CONTRACT_FILL_DESCRIPTIONS: Record<string, string> = {
  name:
    "Project name in the format \"<Beneficiary> <project_type code> <capacity> MW\": the beneficiary's " +
    "name in title case without legal forms (drop S.C., SRL, SA, etc.), then the same code you return " +
    "for project_type, then the main installed capacity in MW with a dot decimal (for CEF+BESS use " +
    "\"<solar> MW + <bess> MW\"; omit the capacity if the contract states none). No other words. " +
    "Example: \"Nero Energy CEF 2.15 MW\"",
  project_type:
    "Technical type of the plant, exactly one of these codes: " +
    "\"CEF\" (photovoltaic park only), \"CEF+BESS\" (new PV park with battery storage), " +
    "\"BESS\" (standalone battery storage), \"BESS_CEF\" (battery storage added to an existing PV park), " +
    "\"EMS\" (energy management system), \"SCADA\" (automation / SCADA)",
  contract_type:
    "Scope of work the contract covers, as a comma-separated list of these codes: " +
    "\"proiectare\" (design / engineering), \"executie\" (construction / installation works), " +
    "\"mentenanta\" (maintenance / O&M), \"racordare\" (grid connection). Example: \"proiectare,executie\"",
  mw_solar: "Installed solar (PV) capacity in megawatts, plain number with a dot decimal separator (e.g. 2.158); convert kW to MW",
  mw_bess: "Installed battery storage (BESS) capacity in megawatts, plain number with a dot decimal separator; convert kW to MW",
  contract_number: "Contract number exactly as written on the contract (e.g. 12/2025)",
  contract_date: "Date the contract was signed, in YYYY-MM-DD format",
  deadline: "Final completion deadline for the works, in YYYY-MM-DD format (e.g. 'termen finalizare: maxim 31.12.2026' -> 2026-12-31)",
  value_amount: "Total contract value WITHOUT VAT, as a plain number with a dot decimal separator and no thousands separators (e.g. 4.945.514,23 lei -> 4945514.23)",
  currency: "Currency of value_amount: exactly \"RON\" (also for lei) or \"EUR\"",
  notes: "Short notes with important facts NOT captured by the other fields (e.g. the parties with their CUI / J-number, special conditions). Do not repeat the value, deadline, capacity or contract number",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses "4945514.23", "4.945.514,23" or "4,945,514.23" into a number. */
function parseAmount(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return s !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

async function findContractDocument(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  projectId: number,
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, onedrive_item_id")
    .eq("project_id", projectId)
    .eq("label", "Contract")
    .not("onedrive_item_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as { id: number; name: string; onedrive_item_id: string } | null;
}

/** The newest file uploaded under the project's "Contract" document label, if any. */
export async function getProjectContractDocument(
  projectId: number,
): Promise<{ id: number; name: string } | null> {
  const { supabase } = await requireAuth();
  const doc = await findContractDocument(supabase, projectId);
  return doc ? { id: doc.id, name: doc.name } : null;
}

export type ContractFillResult =
  | { suggestions: Record<string, string>; error?: undefined }
  | { error: string; suggestions?: undefined };

/**
 * Reads the project's uploaded contract and asks the model for the basic
 * project fields. Only returns suggestions — nothing is saved until the user
 * submits the edit form.
 */
export async function fillProjectFromContract(projectId: number): Promise<ContractFillResult> {
  try {
    const { supabase } = await requireMutator();
    const doc = await findContractDocument(supabase, projectId);
    if (!doc) return { error: "contractFill.noContract" };

    const { getFileContent } = await import("@/core/microsoft/folderProvider");
    const { MAX_FILE_SIZE, resolveMimeType, extractFieldsFromFile } = await import("@/core/ai/extractFormFields");
    const { ROMANIAN_COUNTIES, PROJECT_TYPES, CONTRACT_TYPES } = await import("@/features/projects/types");

    const file = await getFileContent(doc.onedrive_item_id);
    const mimeType = resolveMimeType(file.name || doc.name, file.mimeType);
    if (!mimeType) return { error: "contractFill.unsupported" };
    if (file.content.byteLength > MAX_FILE_SIZE) return { error: "contractFill.tooLarge" };

    const locale = (await getLocale()) as "en" | "hu" | "ro";
    const raw = await extractFieldsFromFile({
      content: file.content,
      name: file.name || doc.name,
      mimeType,
      formType: "project",
      targetFields: CONTRACT_FILL_FIELDS,
      context: { document: "signed contract between the client and Veltol for this project" },
      locale,
      descriptions: CONTRACT_FILL_DESCRIPTIONS,
    });

    const suggestions: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (key === "county") {
        // The form's county is an enum select — drop anything it can't show.
        const match = (ROMANIAN_COUNTIES as readonly string[]).find(
          (c) => c.localeCompare(trimmed, "ro", { sensitivity: "base" }) === 0,
        );
        if (match) suggestions.county = match;
        continue;
      }
      if (key === "name") {
        // Keep the current name rather than overwrite it with a sentence.
        if (trimmed.length >= 5 && trimmed.length <= 80) suggestions.name = trimmed;
        continue;
      }
      if (key === "project_type") {
        // Enum select — only an exact code can be shown.
        const match = (PROJECT_TYPES as string[]).find((pt) => pt.toUpperCase() === trimmed.toUpperCase());
        if (match) suggestions.project_type = match;
        continue;
      }
      if (key === "contract_type") {
        const picked = trimmed
          .toLowerCase()
          .split(/[,\s]+/)
          .filter((c) => (CONTRACT_TYPES as string[]).includes(c));
        if (picked.length > 0) suggestions.contract_type = [...new Set(picked)].join(",");
        continue;
      }
      if (key === "contract_date" || key === "deadline") {
        if (ISO_DATE.test(trimmed) && !isNaN(Date.parse(trimmed))) suggestions[key] = trimmed;
        continue;
      }
      if (key === "value_amount" || key === "mw_solar" || key === "mw_bess") {
        const n = parseAmount(trimmed);
        if (n !== null) suggestions[key] = String(n);
        continue;
      }
      if (key === "currency") {
        const upper = trimmed.toUpperCase();
        const currency = upper === "LEI" ? "RON" : upper;
        if (currency === "RON" || currency === "EUR") suggestions.currency = currency;
        continue;
      }
      suggestions[key] = trimmed;
    }
    return { suggestions };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    console.error("[fillProjectFromContract]", e);
    return { error: "contractFill.failed" };
  }
}
