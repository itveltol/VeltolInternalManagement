import { getTranslations, getLocale } from "next-intl/server";
import { Plus, Wallet, Gauge, FolderKanban, CheckCircle2 } from "lucide-react";
import { DashboardKpiRow } from "@/features/dashboard/components/DashboardKpiRow";
import { DashboardRecentProjects } from "@/features/dashboard/components/DashboardRecentProjects";
import { IncomeByMonthChart } from "@/features/dashboard/components/IncomeByMonthChart";
import { IncomeCompareChart } from "@/features/dashboard/components/IncomeCompareChart";
import { ContractTypeBreakdown } from "@/features/dashboard/components/ContractTypeBreakdown";
import { PhaseDistributionBar } from "@/features/dashboard/components/PhaseDistributionBar";
import { getAvailableYears, countProjectsWithoutDeadline } from "@/features/dashboard/lib/income";
import { redirect } from "next/navigation";
import { requireAuth, getProjects, getDashboardStats } from "@/app/[locale]/(app)/dashboard/action";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";

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

  const kpiRealIcons = {
    [t("totalProjectsValue")]: Wallet,
    [t("totalCapacity")]: Gauge,
    [t("totalProjects")]: FolderKanban,
    [t("totalFinishedProjects")]: CheckCircle2,
  };

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

  const phaseCounts = new Map<string, number>();
  for (const p of projectsData) {
    phaseCounts.set(p.current_phase, (phaseCounts.get(p.current_phase) ?? 0) + 1);
  }
  const PHASE_COLORS: Record<string, string> = {
    closed: "var(--v-success)",
    construction: "var(--v-blue)",
    permitting: "var(--v-warning)",
    proposal: "var(--v-grey)",
  };
  const distributionPhases = (["closed", "construction", "permitting", "proposal"] as const)
    .map((phase) => ({
      phase,
      label: tPhase(phase),
      count: phaseCounts.get(phase) ?? 0,
      color: PHASE_COLORS[phase],
    }))
    .filter((p) => p.count > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowSegments={[t("eyebrowSection"), t("eyebrowSub")]}
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button size="lg" nativeButton={false} render={<Link href="/projects" />}>
            <Plus data-icon="inline-start" />
            {t("addProject")}
          </Button>
        }
      />

      <DashboardKpiRow cards={kpiCardsReal} icons={kpiRealIcons} />

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

      {distributionPhases.length > 0 && (
        <PhaseDistributionBar
          eyebrow={t("phaseDistributionEyebrow")}
          title={t("phaseDistributionTitle")}
          phases={distributionPhases}
        />
      )}

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
