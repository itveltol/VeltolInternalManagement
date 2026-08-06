"use client";

import { MarginKpiHeader } from "./MarginKpiHeader";
import { DevizTable } from "./DevizTable";
import { computeMarginSummary } from "../services/marginService";
import type { CostCategory, ProjectBudgetLine } from "../types";

interface Props {
  projectId: number;
  contractValueEur: number | null;
  categories: CostCategory[];
  lines: ProjectBudgetLine[];
  exchangeRate: number | null;
  canMutate: boolean;
}

export function FinanciarShell({ projectId, contractValueEur, categories, lines, exchangeRate, canMutate }: Props) {
  const summary = computeMarginSummary(contractValueEur, lines);

  return (
    <div className="space-y-4">
      <MarginKpiHeader summary={summary} />
      <DevizTable
        projectId={projectId}
        categories={categories}
        lines={lines}
        exchangeRate={exchangeRate}
        canMutate={canMutate}
      />
    </div>
  );
}
