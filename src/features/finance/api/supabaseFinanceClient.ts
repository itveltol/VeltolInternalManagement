import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceApiClient, BudgetLinePayload } from "./types";
import type { CostCategory, ProjectBudgetLine } from "../types";

const BUDGET_LINE_SELECT = "*, cost_category:cost_categories(*)";

export const createSupabaseFinanceClient = (supabase: SupabaseClient): FinanceApiClient => ({
  async getCostCategories() {
    const { data, error } = await supabase
      .from("cost_categories")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as CostCategory[];
  },

  async getBudgetLines(projectId) {
    const { data, error } = await supabase
      .from("project_budget_lines")
      .select(BUDGET_LINE_SELECT)
      .eq("project_id", projectId)
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProjectBudgetLine[];
  },

  async getBudgetLineById(id) {
    const { data, error } = await supabase
      .from("project_budget_lines")
      .select(BUDGET_LINE_SELECT)
      .eq("id", id)
      .single();
    if (error) return null;
    return data as unknown as ProjectBudgetLine | null;
  },

  async createBudgetLine(projectId, payload: BudgetLinePayload, createdBy: string | null) {
    const amount = payload.qty * payload.unit_price;
    const { data, error } = await supabase
      .from("project_budget_lines")
      .insert({ project_id: projectId, ...payload, amount, created_by: createdBy })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateBudgetLine(id, payload: BudgetLinePayload) {
    const amount = payload.qty * payload.unit_price;
    const { error } = await supabase
      .from("project_budget_lines")
      .update({ ...payload, amount })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteBudgetLine(id) {
    const { error } = await supabase.from("project_budget_lines").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
});
