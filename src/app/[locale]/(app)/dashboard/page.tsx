import { getTranslations, getLocale } from "next-intl/server";
import { Plus, Wallet, Gauge, FolderKanban, CheckCircle2 } from "lucide-react";
import { DashboardKpiRow } from "@/features/dashboard/components/DashboardKpiRow";
import { MaintenanceRemindersCard } from "@/features/dashboard/components/MaintenanceRemindersCard";
import { AvizRemindersCard } from "@/features/dashboard/components/AvizRemindersCard";
import { redirect } from "next/navigation";
import { getProjects, getDashboardStats, getMaintenanceReminders, getAvizReminders } from "@/app/[locale]/(app)/dashboard/action";
import { requireAuth } from "@/core/supabase/session";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  const { user } = await requireAuth();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const projectsData = await getProjects();
  const [
    { totalPortfolioValue, totalCapacity, totalProjects, totalFinishedProjects, residential, industrial },
    maintenanceReminders,
    avizReminders,
  ] = await Promise.all([
    getDashboardStats(projectsData),
    getMaintenanceReminders(projectsData),
    getAvizReminders(projectsData),
  ]);

  const kpiCardsReal = [
    { label: t("totalProjectsValue"), value: totalPortfolioValue.toLocaleString("hu-HU"), unit: "EUR", delta: "", deltaPositive: true, featured: true },
    { label: t("totalCapacity"), value: totalCapacity.toLocaleString("hu-HU"), unit: "MW", delta: "", deltaPositive: true, featured: false },
    { label: t("totalProjects"), value: totalProjects.toString(), unit: "", delta: "", deltaPositive: true, featured: false },
    { label: t("totalFinishedProjects"), value: totalFinishedProjects.toString(), unit: "", delta: "", deltaPositive: true, featured: false },
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowSegments={[t("eyebrowSection"), t("eyebrowSub")]}
        title={t("title")}
        action={
          <Button size="lg" nativeButton={false} render={<Link href="/projects" />}>
            <Plus data-icon="inline-start" />
            {t("addProject")}
          </Button>
        }
      />

      <DashboardKpiRow cards={kpiCardsReal} icons={kpiRealIcons} />

      <DashboardKpiRow cards={kpiCardsByCategory} />

      {avizReminders.length > 0 && (
        <AvizRemindersCard reminders={avizReminders} />
      )}

      {maintenanceReminders.length > 0 && (
        <MaintenanceRemindersCard reminders={maintenanceReminders} />
      )}

    </div>
  );
}
