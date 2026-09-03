import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getWeekGrid, getTeamLookup, getTeamRoster, getPmColorsAction } from "./actions";
import { ScheduleShell } from "@/features/schedule/components/ScheduleShell";
import { TeamRosterTable } from "@/features/schedule/components/TeamRosterTable";
import { WorkerHoursSummaryTable } from "@/features/schedule/components/WorkerHoursSummaryTable";
import { PmColorManager } from "@/features/schedule/components/PmColorManager";
import { mondayOf, summarizeWorkerHours } from "@/features/schedule/services/scheduleService";

interface Props {
  searchParams: Promise<{ week?: string }>;
}

export default async function SchedulePage({ searchParams }: Props) {
  const { user, role } = await getUserProfileRole();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const { week } = await searchParams;
  const weekStart = week ?? mondayOf(new Date());

  const [grid, teamLookup, roster, pmColors] = await Promise.all([
    getWeekGrid(weekStart),
    getTeamLookup(),
    getTeamRoster(),
    getPmColorsAction(),
  ]);
  const t = await getTranslations("schedule");
  const hoursSummary = summarizeWorkerHours(grid.cards);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-veltol-fgMute">{t("subtitle")}</p>
      </div>

      <div id="schedule-export-region" className="space-y-8">
        <ScheduleShell initialGrid={grid} teamLookup={teamLookup} roster={roster} pmColors={pmColors} canMutate={canMutate} />

        <TeamRosterTable rows={roster} />

        <WorkerHoursSummaryTable rows={hoursSummary} />
      </div>

      <PmColorManager pmColors={pmColors} canMutate={canMutate} />
    </div>
  );
}
