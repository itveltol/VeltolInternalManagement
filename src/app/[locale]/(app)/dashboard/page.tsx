import { getTranslations } from "next-intl/server";
import { kpiCards, projects } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { statusVariant } from "@/lib/status-variant";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tPhase = await getTranslations("projectPhase");
  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="mono-label text-[10px] text-veltol-fgMute">
          {t("eyebrow")}
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">
          {t("subtitle")}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) =>
          card.featured ? (
            /* Featured gradient card */
            <div
              key={card.label}
              className="relative overflow-hidden rounded-xl p-5 text-white shadow-v-glow-lg"
              style={{
                background:
                  "linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 75% 20%, rgba(255,255,255,0.22), transparent 60%)",
                }}
              />
              <div className="relative">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">
                  {card.label}
                </span>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-[30px] font-medium leading-none tracking-tight">
                    {card.value}
                  </span>
                  <span className="font-mono text-[11px] text-white/75">
                    {card.unit}
                  </span>
                </div>
                <span className="mt-3 block font-mono text-[10px] tracking-wider text-white/80">
                  {card.delta}
                </span>
              </div>
            </div>
          ) : (
            /* Plain glass card */
            <div
              key={card.label}
              className="relative overflow-hidden rounded-xl border border-veltol-aqua/10 bg-veltol-deep/60 p-5 backdrop-blur-xl"
            >
              {/* Top hairline */}
              <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-veltol-aqua/40 to-transparent" />
              <div className="relative">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-veltol-fgMute">
                  {card.label}
                </span>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-[30px] font-medium leading-none tracking-tight text-veltol-fg">
                    {card.value}
                  </span>
                  <span className="font-mono text-[11px] text-veltol-fgDim">
                    {card.unit}
                  </span>
                </div>
                <span
                  className={`mt-3 block font-mono text-[10px] tracking-wider ${
                    card.deltaPositive ? "text-veltol-green" : "text-veltol-amber"
                  }`}
                >
                  {card.delta}
                </span>
              </div>
            </div>
          )
        )}
      </div>

      {/* Recent projects */}
      <div className="v-panel v-hairline relative overflow-hidden rounded-xl">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="mono-label text-[10px] text-veltol-fgMute">
                {t("recentEyebrow")}
              </span>
              <h2 className="mt-0.5 font-display text-base font-semibold text-veltol-fg">
                {t("recentTitle")}
              </h2>
            </div>
            {/* Live pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-veltol-green/20 bg-veltol-green/[0.08] px-2.5 py-1">
              <div className="v-live-dot" />
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-green">
                {t("live")}
              </span>
            </div>
          </div>
        </div>

        {/* Hairline divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-veltol-aqua/20 to-transparent" />

        <div className="divide-y divide-white/[0.04]">
          {recentProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-4 px-5 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-veltol-fgMute">
                    {project.id}
                  </span>
                  <span className="truncate text-[13px] font-medium text-veltol-fg">
                    {project.name}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-veltol-fgDim">
                  {project.location}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono tabular-nums text-[13px] text-veltol-fg">
                  {project.capacityMWp.toFixed(1)}{" "}
                  <span className="text-veltol-fgMute">MWp</span>
                </div>
                <div className="mt-0.5 font-mono tabular-nums text-[11px] text-veltol-fgDim">
                  {project.valueEur.toLocaleString("hu-HU")}{" "}
                  <span className="text-veltol-fgMute">EUR</span>
                </div>
              </div>
              <div className="shrink-0">
                <Badge variant={statusVariant(project.status)}>
                  {tPhase(project.status)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
