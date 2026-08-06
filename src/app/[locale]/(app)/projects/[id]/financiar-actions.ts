"use server";

import { z } from "zod";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseFinanceClient } from "@/features/finance/api/supabaseFinanceClient";
import { createSupabaseExchangeRatesClient } from "@/features/exchangeRates/api/supabaseExchangeRatesClient";
import { getTodaysRate } from "@/features/exchangeRates/services/exchangeRateService";
import * as financeService from "@/features/finance/services/financeService";
import type { CostCategory, ProjectBudgetLine } from "@/features/finance/types";
import { parseFormData } from "@/shared/utils/parseFormData";

export type ActionState = { error?: string; success?: string } | null;

const numeric = () => z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number());

const optionalInt = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : null),
    z.number().int().nullable(),
  );

const budgetLineSchema = z.object({
  cost_category_id: numeric(),
  phase_no: optionalInt(),
  description: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
  qty: numeric(),
  unit: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
  unit_price: numeric(),
  currency: z.enum(["EUR", "RON"]).default("EUR"),
});

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

async function getFinanciarPath(projectId: number) {
  const locale = await getLocale();
  return `/${locale}/projects/${projectId}?tab=financiar`;
}

export async function getCostCategories(): Promise<CostCategory[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseFinanceClient(supabase);
  return financeService.getCostCategories(api);
}

export async function getBudgetLines(projectId: number): Promise<ProjectBudgetLine[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseFinanceClient(supabase);
  return financeService.getBudgetLines(api, projectId);
}

export async function getBudgetLineExchangeRate(): Promise<number | null> {
  const { supabase } = await requireAuth();
  const client = createSupabaseExchangeRatesClient(supabase);
  const rate = await getTodaysRate(client);
  return rate?.eurRon ?? null;
}

export async function createBudgetLineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const parsed = parseFormData(budgetLineSchema, formData);
    if (!parsed.success) return { error: parsed.error };

    const projectId = Number(formData.get("project_id"));
    if (!projectId) return { error: "errorGeneric" };

    const exchangeRateClient = createSupabaseExchangeRatesClient(supabase);
    const rate = await getTodaysRate(exchangeRateClient);

    const api = createSupabaseFinanceClient(supabase);
    await financeService.createBudgetLine(
      api,
      projectId,
      { ...parsed.data, conversion_rate: rate?.eurRon ?? null },
      user.id,
    );

    revalidatePath(await getFinanciarPath(projectId));
    return { success: "lineSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateBudgetLineAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const parsed = parseFormData(budgetLineSchema, formData);
    if (!parsed.success) return { error: parsed.error };

    const lineId = Number(formData.get("lineId"));
    if (!lineId) return { error: "errorGeneric" };

    const api = createSupabaseFinanceClient(supabase);
    const existingLine = await financeService.getBudgetLineById(api, lineId);
    if (!existingLine) return { error: "errorGeneric" };

    // conversion_rate stays frozen on edit unless the user explicitly hit
    // "refresh to today's rate" (CurrencyAmountInput's hidden flag) — same
    // convention as projects/actions.ts updateProject.
    const refreshRate = formData.get("unit_price_refresh_rate") === "true";
    const conversionRate = refreshRate
      ? (await getTodaysRate(createSupabaseExchangeRatesClient(supabase)))?.eurRon ?? existingLine.conversion_rate
      : existingLine.conversion_rate;

    await financeService.updateBudgetLine(api, lineId, { ...parsed.data, conversion_rate: conversionRate });

    revalidatePath(await getFinanciarPath(existingLine.project_id));
    return { success: "lineSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteBudgetLineAction(lineId: number, projectId: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const api = createSupabaseFinanceClient(supabase);
    await financeService.deleteBudgetLine(api, lineId);
    revalidatePath(await getFinanciarPath(projectId));
    return { success: "lineDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
