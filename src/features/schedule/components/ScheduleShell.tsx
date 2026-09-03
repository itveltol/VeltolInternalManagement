"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { TableShell, TableDesktopView } from "@/shared/components/ui/table-shell";
import { DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardBody, DataCardField } from "@/shared/components/ui/data-card";
import { formatDate } from "@/shared/utils/formatDate";
import { memberInitials } from "../utils/memberInitials";
import { DayAssignmentCard } from "./DayAssignmentCard";
import { AssigneePicker } from "./AssigneePicker";
import { ExportScheduleButton } from "./ExportScheduleButton";
import { mondayOf, shiftWeek, weekDates, toTeamRows } from "../services/scheduleService";
import type { WeekGrid, ScheduleAssignment, ScheduleAssignee, PmColorEntry } from "../types";
import type { TeamLookupEntry } from "../services/scheduleService";
import type { RosterRow } from "./TeamRosterTable";

interface TeamLookup {
  byAssigneeId: Record<string, TeamLookupEntry>;
  teams: TeamLookupEntry[];
  customLabel: string;
}

interface Props {
  initialGrid: WeekGrid;
  teamLookup: TeamLookup;
  roster: RosterRow[];
  pmColors: PmColorEntry[];
  canMutate: boolean;
}

interface EditTarget {
  assignment: ScheduleAssignment | null;
  initialStartDate?: string;
  initialEndDate?: string;
  initialAssignees?: ScheduleAssignee[];
  /** Team rows have a fixed roster — lock the assignee field instead of letting it be freely edited. */
  lockAssignees?: boolean;
}

// Deterministic per-team accent, cycled by row position — teams have no color of their own yet.
const TEAM_DOT_COLORS = ["#2F6BED", "#16A34A", "#0891B2", "#E0A312", "#9333EA", "#DC2626"];

function AddDayButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-2 text-[12px] text-veltol-fgMute transition-colors hover:border-veltol-accent/50 hover:text-veltol-accent"
    >
      <Plus className="h-3 w-3" />
      {label}
    </button>
  );
}

export function ScheduleShell({ initialGrid, teamLookup, roster, pmColors, canMutate }: Props) {
  const t = useTranslations("schedule");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  function goToWeek(weekStart: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", weekStart);
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentWeekStart = mondayOf(new Date());
  const todayStr = new Date().toISOString().slice(0, 10);
  const dates = weekDates(initialGrid.weekStart);

  const teamByAssigneeId = useMemo(
    () => new Map(Object.entries(teamLookup.byAssigneeId)),
    [teamLookup.byAssigneeId],
  );
  const teamRows = useMemo(
    () => toTeamRows(initialGrid.cards, dates, teamByAssigneeId, teamLookup.teams, teamLookup.customLabel),
    [initialGrid.cards, dates, teamByAssigneeId, teamLookup.teams, teamLookup.customLabel],
  );
  const membersByTeamId = useMemo(
    () => new Map(roster.map((row) => [row.team_id, row.members as ScheduleAssignee[]])),
    [roster],
  );
  const pmColorMap = useMemo(
    () => new Map(pmColors.filter((p) => p.color).map((p) => [p.pm_id, p.color as string])),
    [pmColors],
  );

  function closeEditTarget() {
    setEditTarget(null);
    router.refresh();
  }

  function openAddForDay(teamId: number | null, date: string) {
    setEditTarget({
      assignment: null,
      initialStartDate: date,
      initialEndDate: date,
      initialAssignees: teamId !== null ? membersByTeamId.get(teamId) : undefined,
      lockAssignees: teamId !== null,
    });
  }

  function findAssignment(assignmentId: number): ScheduleAssignment | null {
    for (const card of initialGrid.cards) {
      const found = card.assignments.find((a) => a.id === assignmentId);
      if (found) return found;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => goToWeek(shiftWeek(initialGrid.weekStart, -1))}>
            <ChevronLeft />
          </Button>
          <span className="min-w-[13rem] text-center text-sm font-medium text-veltol-fg">
            {formatDate(initialGrid.weekStart, { year: undefined })} – {formatDate(initialGrid.weekEnd, { year: undefined })}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => goToWeek(shiftWeek(initialGrid.weekStart, 1))}>
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {canMutate && (
            <Button onClick={() => setEditTarget({ assignment: null })}>
              <Plus data-icon="inline-start" />
              {t("entry.scheduleProject")}
            </Button>
          )}
          <ExportScheduleButton weekStart={initialGrid.weekStart} />
          <Button variant="outline" onClick={() => goToWeek(currentWeekStart)}>
            <RotateCcw data-icon="inline-start" />
            {t("today")}
          </Button>
        </div>
      </div>

      <TableShell>
        <TableDesktopView>
          <table className="w-full table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="bg-veltol-surface/60">
                <th className="w-44 px-4 py-3 text-left text-[11px] font-semibold tracking-wide text-veltol-fgMute uppercase">
                  {t("columns.team")}
                </th>
                {dates.map((date) => {
                  const isToday = date === todayStr;
                  return (
                    <th
                      key={date}
                      className={`px-3 py-3 text-left align-top text-[13px] ${
                        isToday ? "bg-veltol-accent/10" : ""
                      }`}
                    >
                      <span className={`font-semibold ${isToday ? "text-veltol-accent" : "text-veltol-fg"}`}>
                        {formatDate(date, { weekday: "short", day: undefined, month: undefined, year: undefined })}
                      </span>{" "}
                      <span className="font-normal text-veltol-fgMute">
                        {formatDate(date, { weekday: undefined, day: "2-digit", month: "2-digit", year: undefined })}
                      </span>
                      {isToday && (
                        <span className="mt-1 block w-fit rounded-md bg-veltol-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {t("today")}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teamRows.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                teamRows.map((row, rowIndex) => {
                  const dotColor = TEAM_DOT_COLORS[rowIndex % TEAM_DOT_COLORS.length];
                  const members = row.team_id !== null ? membersByTeamId.get(row.team_id) ?? [] : [];
                  const jobsThisWeek = row.days.reduce((sum, column) => sum + column.cards.length, 0);
                  return (
                    <tr key={row.team_id ?? "unassigned"} className="align-top">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                          <span className="font-semibold text-veltol-fg">{row.team_name}</span>
                        </div>
                        {members.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {members.map((m) => (
                              <span
                                key={m.id}
                                title={m.name}
                                className="flex size-5 items-center justify-center rounded-full bg-veltol-tint text-[9px] font-bold text-veltol-accent"
                              >
                                {memberInitials(m.name)}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="mt-1.5 text-[11px] text-veltol-fgMute">
                          {t("roster.jobsThisWeek", { count: jobsThisWeek })}
                        </p>
                      </td>
                      {row.days.map((column) => (
                        <td key={column.date} className="px-2 py-2 align-top">
                          <div className="flex flex-col gap-2">
                            {column.cards.map((card) => (
                              <DayAssignmentCard
                                key={`${card.assignment_id}-${card.day.work_date}`}
                                card={card}
                                canMutate={canMutate}
                                pmColors={pmColorMap}
                                onEdit={() =>
                                  setEditTarget({
                                    assignment: findAssignment(card.assignment_id),
                                    lockAssignees: row.team_id !== null,
                                  })
                                }
                              />
                            ))}
                            {canMutate && (
                              <AddDayButton label={t("add")} onClick={() => openAddForDay(row.team_id, column.date)} />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {teamRows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : (
          <DataCardList>
            {teamRows.map((row) => (
              <DataCard key={row.team_id ?? "unassigned"}>
                <DataCardHeader>
                  <DataCardTitle>{row.team_name}</DataCardTitle>
                </DataCardHeader>
                <DataCardBody>
                  {row.days.map((column) => (
                    <DataCardField
                      key={column.date}
                      full
                      label={formatDate(column.date, { weekday: "short", day: "2-digit", month: "2-digit", year: undefined })}
                    >
                      <div className="flex flex-col gap-2">
                        {column.cards.map((card) => (
                          <DayAssignmentCard
                            key={`${card.assignment_id}-${card.day.work_date}`}
                            card={card}
                            canMutate={canMutate}
                            pmColors={pmColorMap}
                            onEdit={() => setEditTarget({ assignment: findAssignment(card.assignment_id) })}
                          />
                        ))}
                        {canMutate && (
                          <AddDayButton label={t("add")} onClick={() => openAddForDay(row.team_id, column.date)} />
                        )}
                      </div>
                    </DataCardField>
                  ))}
                </DataCardBody>
              </DataCard>
            ))}
          </DataCardList>
        )}
      </TableShell>

      {editTarget && (
        <AssigneePicker
          open
          onClose={closeEditTarget}
          assignment={editTarget.assignment}
          initialStartDate={editTarget.initialStartDate}
          initialEndDate={editTarget.initialEndDate}
          initialAssignees={editTarget.initialAssignees}
          lockAssignees={editTarget.lockAssignees}
        />
      )}
    </div>
  );
}
