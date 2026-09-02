"use server";

import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseSituationsClient } from "@/features/situations/api/supabaseSituationsClient";
import * as situationService from "@/features/situations/services/situationService";
import { buildCentralizerRows } from "@/features/situations/services/centralizerService";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import type { SituationWithProject, CentralizerRow } from "@/features/situations/types";
import type { Project } from "@/features/projects/types";
import { convertCurrency } from "@/shared/utils/currency";
import { createSupabaseExchangeRatesClient } from "@/features/exchangeRates/api/supabaseExchangeRatesClient";
import { getTodaysRate } from "@/features/exchangeRates/services/exchangeRateService";
import { parseFormData } from "@/shared/utils/parseFormData";

export type ActionState = { error?: string; success?: string; fieldErrors?: Record<string, string> } | null;

const numeric = () => z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number());

const contractSchema = z.object({
  client_id: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().min(1)),
  value_amount: numeric(),
  value_currency: z.enum(["EUR", "RON"]),
});

async function getSituationsPath() {
  const locale = await getLocale();
  return `/${locale}/situations`;
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

/** Gates finance-only writes (contract value, marking a situation paid) on
 * can_manage_finance() at the RLS layer (admin + finance) — mirrors the
 * projects_budget_lines requireMutator pattern but with the finance-specific
 * role set. */
async function requireFinanceMutator() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (!["admin", "finance"].includes(role ?? "")) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

export async function getAllSituationsWithProjects(): Promise<SituationWithProject[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseSituationsClient(supabase);
  return situationService.getAllSituationsWithProjects(api);
}

export async function getProjectsForPicker(): Promise<Project[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseProjectsClient(supabase);
  return projectService.getProjects(api);
}

/** Every project the caller can see gets a centralizer row, so this fetches
 * projects and final-or-paid situations independently and joins them in
 * buildCentralizerRows — each table's own RLS applies naturally (no Postgres
 * view / security_invoker semantics to reason about). */
export async function getCentralizerRows(): Promise<CentralizerRow[]> {
  const { supabase } = await requireAuth();
  const projectsApi = createSupabaseProjectsClient(supabase);
  const situationsApi = createSupabaseSituationsClient(supabase);

  const [projects, billableSituations] = await Promise.all([
    projectService.getProjects(projectsApi),
    situationService.getAllBillableSituations(situationsApi),
  ]);

  return buildCentralizerRows(projects, billableSituations);
}

export async function getBillingExchangeRate(): Promise<number | null> {
  try {
    const { supabase } = await requireAuth();
    const client = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(client);
    return rate?.eurRon ?? null;
  } catch (e: unknown) {
    console.error("getBillingExchangeRate failed", e);
    return null;
  }
}

export async function createSituationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseSituationsClient(supabase);

    const projectId = Number(formData.get("project_id"));
    const name = ((formData.get("name") as string) ?? "").trim();
    if (!projectId || !name) return { error: "errorGeneric" };

    await situationService.createSituation(api, { projectId, name });

    revalidatePath(await getSituationsPath());
    return { success: "situationCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateSituationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseSituationsClient(supabase);

    const situationId = Number(formData.get("situation_id"));
    const name = ((formData.get("name") as string) ?? "").trim();
    if (!situationId || !name) return { error: "errorGeneric" };

    await situationService.updateSituation(api, situationId, { name });

    revalidatePath(await getSituationsPath());
    return { success: "situationSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteSituationAction(situationId: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const api = createSupabaseSituationsClient(supabase);
    await situationService.deleteSituation(api, situationId);
    revalidatePath(await getSituationsPath());
    return { success: "situationDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}

/**
 * Recomputes pct/amount from fresh DB state (never trusts whatever the
 * client last rendered) before locking the situation, so a stale or
 * tampered client payload can't be permanently frozen as the historical
 * record. pct is the incremental progress since the previous FINALIZED
 * situation for this project (0 if there isn't one), not the project's raw
 * cumulative progress_pct — each situation bills only the work done since
 * the last one.
 */
export async function finalizeSituationAction(situationId: number, projectId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseSituationsClient(supabase);
    const projectsApi = createSupabaseProjectsClient(supabase);

    const [project, siblings] = await Promise.all([
      projectService.getProjectById(projectsApi, projectId),
      situationService.getSituationsForProject(api, projectId),
    ]);
    if (!project) return { error: "errorGeneric" };

    const previous = situationService.findPreviousFinalized(siblings, situationId);
    const previousPct = previous?.pct_snapshot ?? 0;
    const pct = Math.max(0, project.progress_pct - previousPct);

    // Finalizing is the one-shot moment a situation's figures get locked in
    // — same rule as a project's conversion_rate at creation — so this always
    // fetches today's rate rather than reusing the project's original one,
    // which could be stale by months.
    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(exchangeRateClient);
    const conversionRate = rate?.eurRon ?? null;

    const sourceValue = project.currency === "EUR" ? project.value_eur : project.value_lei;
    const billedSource = sourceValue != null ? (pct / 100) * sourceValue : null;
    const billedOther = convertCurrency(
      billedSource,
      project.currency,
      project.currency === "EUR" ? "RON" : "EUR",
      conversionRate,
    );
    const amountEur = project.currency === "EUR" ? billedSource : billedOther;
    const amountLei = project.currency === "RON" ? billedSource : billedOther;

    await situationService.finalizeSituation(api, situationId, { pct, amountEur, amountLei, conversionRate });

    revalidatePath(await getSituationsPath());
    return { success: "situationFinalized" };
  } catch (e: unknown) {
    console.error("finalizeSituationAction failed", e);
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

/**
 * Updates a project's Beneficiar/Valoarea contractului from the
 * centralizer's edit-contract dialog. Deliberately bypasses
 * projects/actions.ts's updateProject/projectSchema, which requires
 * unrelated fields (county, coordinates, MW, execution mode...) this dialog
 * has no business touching — instead spreads the existing project row and
 * overrides only client_id/value_eur/value_lei/currency/conversion_rate,
 * same fallback pattern as extractProjectPayload's paid_by/contract_type
 * handling.
 */
export async function updateContractAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireFinanceMutator();
    const parsed = parseFormData(contractSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

    const projectId = Number(formData.get("project_id"));
    if (!projectId) return { error: "errorGeneric" };

    const projectsApi = createSupabaseProjectsClient(supabase);
    const existing = await projectService.getProjectById(projectsApi, projectId);
    if (!existing) return { error: "errorGeneric" };

    const { client_id, value_amount, value_currency } = parsed.data;

    const refreshValueRate = formData.get("value_amount_refresh_rate") === "true";
    const valueConversionRate = refreshValueRate
      ? (await getTodaysRate(createSupabaseExchangeRatesClient(supabase)))?.eurRon ?? existing.conversion_rate
      : existing.conversion_rate;

    await projectService.updateProject(
      projectsApi,
      projectId,
      {
        name: existing.name,
        county: existing.county,
        site_location: existing.site_location,
        site_lat: existing.site_lat,
        site_lng: existing.site_lng,
        mw_solar: existing.mw_solar,
        mw_bess: existing.mw_bess,
        project_category: existing.project_category,
        financial_type: existing.financial_type,
        project_type: existing.project_type,
        contract_type: existing.contract_type,
        manager_id: existing.manager_id,
        client_id,
        execution_mode: existing.execution_mode,
        current_phase: existing.current_phase,
        progress_pct: existing.progress_pct,
        contract_number: existing.contract_number,
        contract_date: existing.contract_date,
        deadline: existing.deadline,
        value_eur: value_currency === "EUR" ? value_amount : null,
        value_lei: value_currency === "RON" ? value_amount : null,
        currency: value_currency,
        conversion_rate: valueConversionRate,
        status: existing.status,
        status_manual: existing.status_manual,
        notes: existing.notes,
        paid_by: existing.paid_by,
      },
      user.id,
    );

    revalidatePath(await getSituationsPath());
    return { success: "contractSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

/**
 * Marks a finalized situation as paid — the moment its amount starts
 * counting toward the centralizer's Valoare încasată. Gated on
 * requireFinanceMutator (admin/finance), distinct from finalize's
 * requireMutator (admin/project_manager): payment collection is a finance
 * fact, not a project-management one. Re-checks the situation's current
 * status fresh from the DB rather than trusting the caller, so a stale
 * client can't mark an already-paid or still-draft situation paid.
 */
export async function markSituationPaidAction(situationId: number, projectId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireFinanceMutator();
    const api = createSupabaseSituationsClient(supabase);

    const siblings = await situationService.getSituationsForProject(api, projectId);
    const situation = siblings.find((s) => s.id === situationId);
    if (!situation || situation.status !== "final") return { error: "errorGeneric" };

    await situationService.markSituationPaid(api, situationId, new Date().toISOString());

    revalidatePath(await getSituationsPath());
    return { success: "situationPaid" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
