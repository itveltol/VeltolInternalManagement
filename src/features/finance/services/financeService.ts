import type { FinanceApiClient, BudgetLinePayload } from "../api/types";
import type { CostCategory, ProjectBudgetLine } from "../types";

export async function getCostCategories(api: FinanceApiClient): Promise<CostCategory[]> {
  return api.getCostCategories();
}

export async function getBudgetLines(api: FinanceApiClient, projectId: number): Promise<ProjectBudgetLine[]> {
  return api.getBudgetLines(projectId);
}

export async function getBudgetLineById(api: FinanceApiClient, id: number): Promise<ProjectBudgetLine | null> {
  return api.getBudgetLineById(id);
}

export async function createBudgetLine(
  api: FinanceApiClient,
  projectId: number,
  payload: BudgetLinePayload,
  createdBy: string | null,
): Promise<{ id: number }> {
  return api.createBudgetLine(projectId, payload, createdBy);
}

export async function updateBudgetLine(api: FinanceApiClient, id: number, payload: BudgetLinePayload): Promise<void> {
  return api.updateBudgetLine(id, payload);
}

export async function deleteBudgetLine(api: FinanceApiClient, id: number): Promise<void> {
  return api.deleteBudgetLine(id);
}
