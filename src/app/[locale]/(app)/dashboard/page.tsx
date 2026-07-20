import { getTranslations, getLocale } from "next-intl/server";
import { DashboardKpiRow } from "@/features/dashboard/components/DashboardKpiRow";
import { DashboardRecentProjects } from "@/features/dashboard/components/DashboardRecentProjects";
import { IncomeByMonthChart } from "@/features/dashboard/components/IncomeByMonthChart";
import { IncomeCompareChart } from "@/features/dashboard/components/IncomeCompareChart";
import { ContractTypeBreakdown } from "@/features/dashboard/components/ContractTypeBreakdown";
import { getAvailableYears, countProjectsWithoutDeadline } from "@/features/dashboard/lib/income";
import { redirect } from "next/navigation";
import { requireAuth, getProjects, getDashboardStats } from "@/app/[locale]/(app)/dashboard/action";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tPhase = await getTranslations("projectPhase");
  const tContractType = await getTranslations("contractType");

  const { user } = await requireAuth();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const projectsData = await getProjects();
  const { totalPortfolioValue, totalCapacity, totalProjects, totalFinishedProjects, residential, industrial } = await getDashboardStats(projectsData);

  const kpiCardsReal = [
    { label: t("totalProjectsValue"), value: totalPortfolioValue.toLocaleString("hu-HU"), unit: "EUR", delta: "+" + "12" + t("percentageChange"), deltaPositive: true, featured: true },
    { label: t("totalCapacity"), value: totalCapacity.toLocaleString("hu-HU"), unit: "MW", delta: "+" + "5" + t("percentageChange"), deltaPositive: true, featured: false },
    { label: t("totalProjects"), value: totalProjects.toString(), unit: "", delta: "+" + "3" + t("percentageChange"), deltaPositive: true, featured: false },
    { label: t("totalFinishedProjects"), value: totalFinishedProjects.toString(), unit: "", delta: "+" + "2" + t("percentageChange"), deltaPositive: true, featured: false },
  ];

  const kpiCardsByCategory = [
    { label: t("residentialValue"), value: residential.totalValue.toLocaleString("hu-HU"), unit: "EUR", delta: "", deltaPositive: true, featured: false },
    { label: t("residentialProjects"), value: residential.totalProjects.toString(), unit: "", delta: "", deltaPositive: true, featured: false },
    { label: t("industrialValue"), value: industrial.totalValue.toLocaleString("hu-HU"), unit: "EUR", delta: "", deltaPositive: true, featured: false },
    { label: t("industrialProjects"), value: industrial.totalProjects.toString(), unit: "", delta: "", deltaPositive: true, featured: false },
  ];

  const recentProjects = projectsData.slice(0, 5);

  const availableYears = getAvailableYears(projectsData);
  const excludedCount = countProjectsWithoutDeadline(projectsData);
  const excludedNote = excludedCount > 0 ? t("incomeExcludedNote", { count: excludedCount }) : null;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <DashboardKpiRow cards={kpiCardsReal} />

      <DashboardKpiRow cards={kpiCardsByCategory} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <IncomeByMonthChart
          projects={projectsData}
          availableYears={availableYears}
          labels={{
            eyebrow: t("incomeByMonthEyebrow"),
            title: t("incomeByMonthTitle"),
            yearLabel: t("incomeYearLabel"),
            noData: t("incomeNoData"),
            incomeLabel: t("incomeLabel"),
            totalLabel: t("incomeTotalLabel"),
            excludedNote,
          }}
        />
        <IncomeCompareChart
          projects={projectsData}
          availableYears={availableYears}
          labels={{
            eyebrow: t("incomeCompareEyebrow"),
            title: t("incomeCompareTitle"),
            selectMonths: t("incomeSelectMonths"),
            clearSelection: t("incomeClearSelection"),
            noData: t("incomeNoData"),
            incomeLabel: t("incomeLabel"),
            excludedNote,
          }}
        />
      </div>

      <ContractTypeBreakdown
        projects={projectsData}
        labels={{
          eyebrow: t("contractTypeBreakdownEyebrow"),
          title: t("contractTypeBreakdownTitle"),
          projectCount: (count) => t("contractTypeProjectCount", { count }),
          contractType: (type) => tContractType(type as Parameters<typeof tContractType>[0]),
        }}
      />

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
