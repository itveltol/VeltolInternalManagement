import type { CostCategory, ProjectBudgetLine, Currency } from "../types";

export interface BudgetLinePayload {
  cost_category_id: number;
  phase_no: number | null;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  currency: Currency;
  conversion_rate: number | null;
}

export interface FinanceApiClient {
  getCostCategories(): Promise<CostCategory[]>;
  getBudgetLines(projectId: number): Promise<ProjectBudgetLine[]>;
  getBudgetLineById(id: number): Promise<ProjectBudgetLine | null>;
  createBudgetLine(projectId: number, payload: BudgetLinePayload, createdBy: string | null): Promise<{ id: number }>;
  updateBudgetLine(id: number, payload: BudgetLinePayload): Promise<void>;
  deleteBudgetLine(id: number): Promise<void>;
}
