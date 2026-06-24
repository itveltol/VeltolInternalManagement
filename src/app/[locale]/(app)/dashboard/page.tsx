import { getTranslations } from "next-intl/server";
import { kpiCards, projects } from "@/features/dashboard/mock-data";
import { DashboardKpiRow } from "@/features/dashboard/components/DashboardKpiRow";
import { DashboardRecentProjects } from "@/features/dashboard/components/DashboardRecentProjects";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tPhase = await getTranslations("projectPhase");
  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <div className="mono-label text-[10px] text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <DashboardKpiRow cards={kpiCards} />

      <DashboardRecentProjects
        projects={recentProjects}
        liveLabel={t("live")}
        eyebrow={t("recentEyebrow")}
        title={t("recentTitle")}
        tPhase={(phase) => tPhase(phase as Parameters<typeof tPhase>[0])}
      />
    </div>
  );
}
