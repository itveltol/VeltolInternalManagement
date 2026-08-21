"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/shared/utils/formatDate";
import { ScheduleGrid } from "./ScheduleGrid";
import { ExportScheduleButton } from "./ExportScheduleButton";
import { mondayOf, shiftWeek, weekEnd } from "../services/scheduleService";
import type { ScheduleEntryProject, WeekGrid } from "../types";

interface Props {
  initialGrid: WeekGrid;
  canMutate: boolean;
  searchProjects: (query: string) => Promise<ScheduleEntryProject[]>;
}

export function ScheduleShell({ initialGrid, canMutate, searchProjects }: Props) {
  const t = useTranslations("schedule");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToWeek(weekStart: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", weekStart);
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentWeekStart = mondayOf(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => goToWeek(shiftWeek(initialGrid.weekStart, -1))}>
            <ChevronLeft />
          </Button>
          <span className="min-w-[13rem] text-center text-sm font-medium text-veltol-fg">
            {formatDate(initialGrid.weekStart, { year: undefined })} – {formatDate(weekEnd(initialGrid.weekStart), { year: undefined })}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => goToWeek(shiftWeek(initialGrid.weekStart, 1))}>
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <ExportScheduleButton rows={initialGrid.rows} weekStart={initialGrid.weekStart} />
          <Button variant="outline" onClick={() => goToWeek(currentWeekStart)}>
            <RotateCcw data-icon="inline-start" />
            {t("today")}
          </Button>
        </div>
      </div>

      <ScheduleGrid rows={initialGrid.rows} canMutate={canMutate} searchProjects={searchProjects} />
    </div>
  );
}
