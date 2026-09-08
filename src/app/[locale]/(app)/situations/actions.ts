"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseSituationsClient } from "@/features/situations/api/supabaseSituationsClient";
import * as situationService from "@/features/situations/services/situationService";
import { buildCentralizerRows } from "@/features/situations/services/centralizerService";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import { createSupabaseContractsClient } from "@/features/projects/contracts/supabaseContractsClient";
import * as contractService from "@/features/projects/contracts/contractService";
import type { SituationWithProject, CentralizerRow, SituationContractRef } from "@/features/situations/types";
import type { Project } from "@/features/projects/types";
import { convertCurrency } from "@/shared/utils/currency";
import { createSupabaseExchangeRatesClient } from "@/features/exchangeRates/api/supabaseExchangeRatesClient";
import { getTodaysRate, getRateForDate } from "@/features/exchangeRates/services/exchangeRateService";
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

/** Every contract the caller can see gets a centralizer row (a project with
 * several contracts now gets several rows), so this fetches contracts (with
 * their project refs and per-contract progress) and final-or-paid
 * situations independently and joins them in buildCentralizerRows — each
 * table's own RLS applies naturally (no Postgres view / security_invoker
 * semantics to reason about). */
export async function getCentralizerRows(): Promise<CentralizerRow[]> {
  const { supabase } = await requireAuth();
  const situationsApi = createSupabaseSituationsClient(supabase);

  const [contracts, billableSituations] = await Promise.all([
    getContractRefs(),
    situationService.getAllBillableSituations(situationsApi),
  ]);

  return buildCentralizerRows(contracts, billableSituations);
}

/** Every contract joined with the project fields the centralizer/situations
 * shell need (category/current_phase/client) plus its own
 * contract_progress_pct — the same per-contract-filtered-Matrice figure used
 * by computeSituationFigures/finalizeSituationAction, not the project's
 * blended progress_pct. Shared by getCentralizerRows and the situations page
 * (which needs the same contract list for the level-2 drilldown/billing
 * dialog) so the join only happens once per request. */
export async function getContractRefs(): Promise<SituationContractRef[]> {
  const { supabase } = await requireAuth();
  return getContractRefsForCentralizer(supabase);
}

async function getContractRefsForCentralizer(supabase: SupabaseClient): Promise<SituationContractRef[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, project_id, value_eur, value_lei, currency, conversion_rate, contract_number, contract_date, contract_type, vat_rate, project:projects(id, name, project_category, current_phase, client:clients(id, name))")
    .order("id");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Omit<SituationContractRef, "progress_pct">[];
  const progressByContractId = new Map<number, number>();
  await Promise.all(
    rows.map(async (row) => {
      const { data: pct, error: pctError } = await supabase.rpc("contract_progress_pct", { p_contract_id: row.id });
      if (pctError) throw new Error(pctError.message);
      progressByContractId.set(row.id, (pct as number) ?? 0);
    }),
  );
  return rows.map((row) => ({ ...row, progress_pct: progressByContractId.get(row.id) ?? 0 }));
}

/** One contract's own completion % — the project's one Matrice filtered
 * down to this contract's contract_type[] (see contract_progress_pct() in
 * supabase/migrations/20260908000128_situations_contract_id.sql), not the
 * project's blended progress_pct. */
async function getContractProgressPct(supabase: SupabaseClient, contractId: number): Promise<number> {
  const { data, error } = await supabase.rpc("contract_progress_pct", { p_contract_id: contractId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
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

    // The create-situation form is still project-scoped (v1: every project
    // has one implicit "primary" contract — see extractContractPayload in
    // projects/actions.ts) — an explicit contract_id field lets a future
    // "pick which contract" UI opt in without changing this action's shape;
    // until then, resolve to the project's first contract.
    let contractId = formData.has("contract_id") ? Number(formData.get("contract_id")) : null;
    if (!contractId) {
      const contractsApi = createSupabaseContractsClient(supabase);
      const [primaryContract] = await contractService.getContractsForProject(contractsApi, projectId);
      if (!primaryContract) return { error: "errorGeneric" };
      contractId = primaryContract.id;
    }

    await situationService.createSituation(api, { projectId, contractId, name });

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
 * situation for this CONTRACT (0 if there isn't one), not the contract's raw
 * cumulative progress_pct (itself the project's one Matrice filtered down to
 * this contract's contract_type[], via contract_progress_pct() — not the
 * project's blended progress_pct) — each situation bills only the work done
 * since the last one.
 */
export async function finalizeSituationAction(situationId: number, contractId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseSituationsClient(supabase);
    const contractsApi = createSupabaseContractsClient(supabase);

    const [contract, siblings, progressPct] = await Promise.all([
      contractService.getContractById(contractsApi, contractId),
      situationService.getSituationsForContract(api, contractId),
      getContractProgressPct(supabase, contractId),
    ]);
    if (!contract) return { error: "errorGeneric" };

    const previous = situationService.findPreviousFinalized(siblings, situationId);
    const previousPct = previous?.pct_snapshot ?? 0;
    const pct = Math.max(0, progressPct - previousPct);

    // Finalizing is the one-shot moment a situation's figures get locked in
    // — same rule as a contract's conversion_rate at creation — so this
    // always fetches today's rate rather than reusing the contract's
    // original one, which could be stale by months.
    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(exchangeRateClient);
    const conversionRate = rate?.eurRon ?? null;

    const sourceValue = contract.currency === "EUR" ? contract.value_eur : contract.value_lei;
    const billedSource = sourceValue != null ? (pct / 100) * sourceValue : null;
    const billedOther = convertCurrency(
      billedSource,
      contract.currency,
      contract.currency === "EUR" ? "RON" : "EUR",
      conversionRate,
    );
    const amountEur = contract.currency === "EUR" ? billedSource : billedOther;
    const amountLei = contract.currency === "RON" ? billedSource : billedOther;

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
 * Updates a contract's Beneficiar (project-level)/Valoarea contractului
 * (contract-level) from the centralizer's edit-contract dialog. Two small
 * writes rather than one, now that these fields live on different tables:
 * client_id stays a project-level relationship (contracts don't each have
 * their own client) and is written to `projects`; value_eur/lei/currency/
 * conversion_rate are written to the specific `contracts` row. Deliberately
 * bypasses projects/actions.ts's updateProject/projectSchema, which requires
 * unrelated fields (county, coordinates, MW, execution mode...) this dialog
 * has no business touching.
 */
export async function updateContractAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireFinanceMutator();
    const parsed = parseFormData(contractSchema, formData);
    if (!parsed.success) return { error: parsed.error, fieldErrors: parsed.fieldErrors };

    const contractId = Number(formData.get("contract_id"));
    if (!contractId) return { error: "errorGeneric" };

    const contractsApi = createSupabaseContractsClient(supabase);
    const existing = await contractService.getContractById(contractsApi, contractId);
    if (!existing) return { error: "errorGeneric" };

    const { client_id, value_amount, value_currency } = parsed.data;

    const refreshValueRate = formData.get("value_amount_refresh_rate") === "true";
    const valueConversionRate = refreshValueRate
      ? (await getTodaysRate(createSupabaseExchangeRatesClient(supabase)))?.eurRon ?? existing.conversion_rate
      : existing.conversion_rate ??
        (await getRateForDate(createSupabaseExchangeRatesClient(supabase), existing.contract_date))?.eurRon ??
        null;

    const projectsApi = createSupabaseProjectsClient(supabase);
    const existingProject = await projectService.getProjectById(projectsApi, existing.project_id);
    if (existingProject && existingProject.client_id !== client_id) {
      await projectsApi.updateProject(
        existing.project_id,
        {
          name: existingProject.name,
          county: existingProject.county,
          site_location: existingProject.site_location,
          site_lat: existingProject.site_lat,
          site_lng: existingProject.site_lng,
          mw_solar: existingProject.mw_solar,
          mw_bess: existingProject.mw_bess,
          people_needed: existingProject.people_needed,
          project_category: existingProject.project_category,
          financial_type: existingProject.financial_type,
          project_type: existingProject.project_type,
          manager_id: existingProject.manager_id,
          sales_id: existingProject.sales_id,
          client_id,
          execution_mode: existingProject.execution_mode,
          current_phase: existingProject.current_phase,
          progress_pct: existingProject.progress_pct,
          deadline: existingProject.deadline,
          status: existingProject.status,
          status_manual: existingProject.status_manual,
          notes: existingProject.notes,
          paid_by: existingProject.paid_by,
        },
        user.id,
      );
    }

    await contractService.updateContract(contractsApi, contractId, {
      value_eur: value_currency === "EUR" ? value_amount : null,
      value_lei: value_currency === "RON" ? value_amount : null,
      currency: value_currency,
      conversion_rate: valueConversionRate,
    });

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
export async function markSituationPaidAction(situationId: number, contractId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireFinanceMutator();
    const api = createSupabaseSituationsClient(supabase);

    const siblings = await situationService.getSituationsForContract(api, contractId);
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
