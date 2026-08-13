import { getTranslations } from "next-intl/server";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { computeTrend } from "../services/metrics";
import type { CommsMetrics } from "../types";

interface Props {
  metrics: CommsMetrics;
}

const METRIC_KEYS = ["ackRate", "staleQuestions", "silentProjects", "decisions"] as const;
const UNIT: Record<(typeof METRIC_KEYS)[number], string> = {
  ackRate: "%",
  staleQuestions: "",
  silentProjects: "",
  decisions: "",
};

export async function MetricsStrip({ metrics }: Props) {
  const t = await getTranslations("comms.metrics");

  return (
    <div className="rounded-card border border-border bg-card p-5 shadow-card">
      <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
      <h2 className="mt-1 text-[15px] font-semibold text-veltol-fg">{t("title")}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_KEYS.map((key) => {
          const metric = metrics[key];
          const trend = computeTrend(metric);
          return (
            <div key={key} className="rounded-lg border border-border px-4 py-3">
              <div className="font-mono text-[28px] font-bold tabular-nums text-veltol-fg">
                {metric.value === null ? "—" : metric.value}
                {metric.value !== null && UNIT[key] && (
                  <span className="text-[16px] text-veltol-fgMute">{UNIT[key]}</span>
                )}
              </div>
              <div className="mt-1 text-[12px] font-medium text-veltol-fgDim">{t(`${key}.label`)}</div>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-veltol-fgMute">
                {trend.direction === "unknown" || trend.delta === null ? (
                  <span>{t("noPriorPeriod")}</span>
                ) : (
                  <>
                    {trend.direction === "up" ? (
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    ) : trend.direction === "down" ? (
                      <TrendingDown className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    )}
                    <span>
                      {trend.delta > 0 ? "+" : ""}
                      {trend.delta}
                      {UNIT[key]} {t("vsTrend")}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-veltol-fgMute">{t(`${key}.meaning`)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
