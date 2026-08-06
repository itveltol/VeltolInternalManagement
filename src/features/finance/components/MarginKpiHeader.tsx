"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/shared/components/ui/badge";
import { formatCurrency } from "@/shared/utils/currency";
import type { ProjectMarginSummary } from "../types";

function formatPct(pct: number | null): string {
  if (pct == null) return "—";
  return `${pct.toFixed(1)}%`;
}

interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  badge?: { label: string; variant: "destructive" | "success" };
}

function KpiTile({ label, value, sub, badge }: KpiTileProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="text-[11px] font-medium text-veltol-fgMute">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="font-mono text-xl font-semibold tabular-nums text-veltol-fg">{value}</div>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-veltol-fgMute">{sub}</div>}
    </div>
  );
}

interface Props {
  summary: ProjectMarginSummary;
}

export function MarginKpiHeader({ summary }: Props) {
  const t = useTranslations("financiar");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiTile
        label={t("kpi.contractValue")}
        value={summary.contractValueEur != null ? formatCurrency(summary.contractValueEur, "EUR") : "—"}
      />
      <KpiTile
        label={t("kpi.budget")}
        value={formatCurrency(summary.budgetEur, "EUR")}
      />
      <KpiTile
        label={t("kpi.marginBudgeted")}
        value={summary.marginBudgetedEur != null ? formatCurrency(summary.marginBudgetedEur, "EUR") : "—"}
        sub={formatPct(summary.marginBudgetedPct)}
        badge={
          summary.marginBudgetedPct != null
            ? summary.isBelowThreshold
              ? { label: t("kpi.belowThreshold"), variant: "destructive" }
              : { label: t("kpi.healthy"), variant: "success" }
            : undefined
        }
      />
      <KpiTile label={t("kpi.committed")} value="—" />
      <KpiTile label={t("kpi.actual")} value="—" />
      <KpiTile label={t("kpi.receivable")} value="—" />
    </div>
  );
}
