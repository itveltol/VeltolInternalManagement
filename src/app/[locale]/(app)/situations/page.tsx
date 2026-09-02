import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getAllSituationsWithProjects, getCentralizerRows, getProjectsForPicker } from "./actions";
import { getProjects as getDashboardProjects } from "@/app/[locale]/(app)/dashboard/action";
import { getProjectManagers } from "@/app/[locale]/(app)/projects/actions";
import { getClientRefs } from "@/app/[locale]/(app)/clients/actions";
import { suggestNextContractNumber } from "@/features/projects/services/projectService";
import { SituationsShell } from "@/features/situations/components/SituationsShell";
import { IncomeByMonthChart, IncomeCompareChart } from "@/features/dashboard/components/DashboardCharts";
import { ContractTypeBreakdown } from "@/features/dashboard/components/ContractTypeBreakdown";
import { PhaseDistributionBar } from "@/features/dashboard/components/PhaseDistributionBar";
import { getAvailableYears, countProjectsWithoutDeadline } from "@/features/dashboard/lib/income";

export default async function SituationsPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const canMutateBilling = ["admin", "finance"].includes(role ?? "");

  const [rows, situations, projects, dashboardProjects, managers, clientRefs] = await Promise.all([
    getCentralizerRows(),
    getAllSituationsWithProjects(),
    getProjectsForPicker(),
    getDashboardProjects(),
    getProjectManagers(),
    getClientRefs(),
  ]);
  const nextContractNumber = suggestNextContractNumber(projects);
  const t = await getTranslations("situations");
  const tDashboard = await getTranslations("dashboard");
  const tPhase = await getTranslations("projectPhase");
  const tContractType = await getTranslations("contractType");

  const availableYears = getAvailableYears(dashboardProjects);
  const excludedCount = countProjectsWithoutDeadline(dashboardProjects);
  const excludedNote = excludedCount > 0 ? tDashboard("incomeExcludedNote", { count: excludedCount }) : null;

  const phaseCounts = new Map<string, number>();
  for (const p of dashboardProjects) {
    phaseCounts.set(p.current_phase, (phaseCounts.get(p.current_phase) ?? 0) + 1);
  }
  const PHASE_COLORS: Record<string, string> = {
    closed: "var(--v-success)",
    construction: "var(--v-blue)",
    permitting: "var(--v-warning)",
    planning: "var(--v-grey)",
  };
  const distributionPhases = (["closed", "construction", "permitting", "planning"] as const)
    .map((phase) => ({
      phase,
      label: tPhase(phase),
      count: phaseCounts.get(phase) ?? 0,
      color: PHASE_COLORS[phase],
    }))
    .filter((p) => p.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <IncomeByMonthChart
          projects={dashboardProjects}
          availableYears={availableYears}
          labels={{
            eyebrow: tDashboard("incomeByMonthEyebrow"),
            title: tDashboard("incomeByMonthTitle"),
            yearLabel: tDashboard("incomeYearLabel"),
            noData: tDashboard("incomeNoData"),
            incomeLabel: tDashboard("incomeLabel"),
            totalLabel: tDashboard("incomeTotalLabel"),
            excludedNote,
          }}
        />
        <IncomeCompareChart
          projects={dashboardProjects}
          availableYears={availableYears}
          labels={{
            eyebrow: tDashboard("incomeCompareEyebrow"),
            title: tDashboard("incomeCompareTitle"),
            selectMonths: tDashboard("incomeSelectMonths"),
            clearSelection: tDashboard("incomeClearSelection"),
            noData: tDashboard("incomeNoData"),
            incomeLabel: tDashboard("incomeLabel"),
            excludedNote,
          }}
        />
      </div>

      <ContractTypeBreakdown
        projects={dashboardProjects}
        labels={{
          eyebrow: tDashboard("contractTypeBreakdownEyebrow"),
          title: tDashboard("contractTypeBreakdownTitle"),
          projectCount: (count) => tDashboard("contractTypeProjectCount", { count }),
          contractType: (type) => tContractType(type as Parameters<typeof tContractType>[0]),
        }}
      />

      {distributionPhases.length > 0 && (
        <PhaseDistributionBar
          eyebrow={tDashboard("phaseDistributionEyebrow")}
          title={tDashboard("phaseDistributionTitle")}
          phases={distributionPhases}
        />
      )}

      <SituationsShell
        rows={rows}
        situations={situations}
        projects={projects}
        managers={managers}
        clientRefs={clientRefs}
        nextContractNumber={nextContractNumber}
        canMutate={canMutate}
        canMutateBilling={canMutateBilling}
      />
    </div>
  );
}
