import type { CostCategory, ProjectBudgetLine, BudgetLinesByCategory, ProjectMarginSummary } from "../types";

/** Below this margin %, the Financiar tab shows a red flag — see
 * PLAN-modul-financiar.md section 9.6. Kept as a single named constant
 * (rather than inline in components) so it stays easy to find and change,
 * pending a future admin-configurable setting. */
export const MARGIN_RED_FLAG_THRESHOLD_PCT = 10;

/** Normalizes a budget line's amount to EUR using its own pinned
 * conversion_rate — never today's rate — so historical lines don't drift.
 * A RON line with no pinned rate can't be normalized and contributes 0,
 * since there's nothing sound to convert it with. */
export function budgetLineAmountEur(line: ProjectBudgetLine): number {
  if (line.currency === "EUR") return line.amount;
  if (line.conversion_rate == null || line.conversion_rate === 0) return 0;
  return line.amount / line.conversion_rate;
}

export function totalBudgetEur(lines: ProjectBudgetLine[]): number {
  return lines.reduce((sum, line) => sum + budgetLineAmountEur(line), 0);
}

/** Groups budget lines by cost category (in category sort_order), each with
 * its EUR-normalized subtotal, for the deviz table. Categories with no lines
 * are omitted. */
export function groupBudgetLinesByCategory(
  categories: CostCategory[],
  lines: ProjectBudgetLine[],
): BudgetLinesByCategory[] {
  const byCategory = new Map<number, ProjectBudgetLine[]>();
  for (const line of lines) {
    const existing = byCategory.get(line.cost_category_id);
    if (existing) existing.push(line);
    else byCategory.set(line.cost_category_id, [line]);
  }

  return categories
    .filter((category) => byCategory.has(category.id))
    .map((category) => {
      const categoryLines = byCategory.get(category.id) ?? [];
      return {
        category,
        lines: categoryLines,
        totalEur: totalBudgetEur(categoryLines),
      };
    });
}

/** Converts a project's own value_eur/value_lei + currency + conversion_rate
 * (the same pinned-rate convention as budget lines) into a single EUR figure
 * for the "Valoare contract" KPI. Returns null when there's no sound
 * conversion available (e.g. RON value with no pinned rate). */
export function contractValueEur(
  currency: "EUR" | "RON",
  valueEur: number | null,
  valueLei: number | null,
  conversionRate: number | null,
): number | null {
  if (currency === "EUR") return valueEur;
  if (valueLei == null || conversionRate == null || conversionRate === 0) return null;
  return valueLei / conversionRate;
}

export function computeMarginSummary(
  contractValue: number | null,
  budgetLines: ProjectBudgetLine[],
): ProjectMarginSummary {
  const budgetEur = totalBudgetEur(budgetLines);
  const marginBudgetedEur = contractValue != null ? contractValue - budgetEur : null;
  const marginBudgetedPct =
    marginBudgetedEur != null && contractValue != null && contractValue !== 0
      ? (marginBudgetedEur / contractValue) * 100
      : null;

  return {
    contractValueEur: contractValue,
    budgetEur,
    marginBudgetedEur,
    marginBudgetedPct,
    isBelowThreshold: marginBudgetedPct != null && marginBudgetedPct < MARGIN_RED_FLAG_THRESHOLD_PCT,
    committedEur: null,
    actualEur: null,
    receivableEur: null,
  };
}
