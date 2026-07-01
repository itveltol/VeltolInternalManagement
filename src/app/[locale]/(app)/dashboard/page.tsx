import { getTranslations, getLocale } from "next-intl/server";
import { projects } from "@/features/dashboard/mock-data";
import { DashboardKpiRow } from "@/features/dashboard/components/DashboardKpiRow";
import { DashboardRecentProjects } from "@/features/dashboard/components/DashboardRecentProjects";
import { redirect } from "next/navigation";
import { requireAuth, getProjects, getDashboardStats } from "@/app/[locale]/(app)/dashboard/action";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tPhase = await getTranslations("projectPhase");

  const { user } = await requireAuth();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const projectsData = await getProjects();
  const { totalPortfolioValue, totalCapacity, totalProjects, totalFinishedProjects } = await getDashboardStats(projectsData);

  const kpiCardsReal = [
    { label: t("totalProjectsValue"), value: totalPortfolioValue.toLocaleString("hu-HU"), unit: "EUR", delta: "+" + "12" + t("percentageChange"), deltaPositive: true, featured: true },
    { label: t("totalCapacity"), value: totalCapacity.toLocaleString("hu-HU"), unit: "MW", delta: "+" + "5" + t("percentageChange"), deltaPositive: true, featured: false },
    { label: t("totalProjects"), value: totalProjects.toString(), unit: "", delta: "+" + "3" + t("percentageChange"), deltaPositive: true, featured: false },
    { label: t("totalFinishedProjects"), value: totalFinishedProjects.toString(), unit: "", delta: "+" + "2" + t("percentageChange"), deltaPositive: true, featured: false },
  ];

  const recentProjects = projectsData.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <div className="mono-label text-[10px] text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <DashboardKpiRow cards={kpiCardsReal} />

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
