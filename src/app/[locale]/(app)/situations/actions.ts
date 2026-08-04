"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseSituationsClient } from "@/features/situations/api/supabaseSituationsClient";
import * as situationService from "@/features/situations/services/situationService";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as projectService from "@/features/projects/services/projectService";
import type { SituationWithProject } from "@/features/situations/types";
import type { Project } from "@/features/projects/types";
import { convertCurrency } from "@/shared/utils/currency";
import { createSupabaseExchangeRatesClient } from "@/features/exchangeRates/api/supabaseExchangeRatesClient";
import { getTodaysRate } from "@/features/exchangeRates/services/exchangeRateService";

export type ActionState = { error?: string; success?: string } | null;

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
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
