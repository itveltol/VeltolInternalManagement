import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/supabase/session";
import { getGanttProjects, getGanttMatriceData, getShownGanttProjectIds } from "./actions";
import { PortfolioGanttShell } from "@/features/gantt/components/PortfolioGanttShell";

export default async function GanttPage() {
  const { user } = await getSessionUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("gantt");

  const [allProjects, initialShownIds] = await Promise.all([
    getGanttProjects(),
    getShownGanttProjectIds(),
  ]);
  const { activities, cells } = await getGanttMatriceData(initialShownIds);
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <PortfolioGanttShell
        allProjects={allProjects}
        initialShownIds={initialShownIds}
        initialActivities={activities}
        initialCells={cells}
        todayMs={todayMs}
      />
    </div>
  );
}
