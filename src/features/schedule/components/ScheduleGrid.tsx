"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { TableShell, TableDesktopView } from "@/shared/components/ui/table-shell";
import { DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardBody, DataCardField } from "@/shared/components/ui/data-card";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatDate } from "@/shared/utils/formatDate";
import { ScheduleEntryDialog } from "./ScheduleEntryDialog";
import { upsertWeekNoteAction } from "@/app/[locale]/(app)/schedule/actions";
import { nextSortOrderForCell } from "../services/scheduleService";
import type { ScheduleEntry, ScheduleEntryProject, TeamScheduleRow } from "../types";

interface EditTarget {
  teamId: number;
  workDate: string;
  entry: ScheduleEntry | null;
}

interface Props {
  rows: TeamScheduleRow[];
  canMutate: boolean;
  searchProjects: (query: string) => Promise<ScheduleEntryProject[]>;
}

function EntryChip({ entry, onClick }: { entry: ScheduleEntry; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full truncate rounded-md border border-border px-1.5 py-1 text-left text-[11px] leading-tight text-veltol-fg transition-colors hover:brightness-95"
      style={entry.color ? { backgroundColor: `${entry.color}22`, borderColor: `${entry.color}55` } : undefined}
      title={entry.project ? `${entry.label} — ${entry.project.name}`.trim() : entry.label}
    >
      {entry.label || entry.project?.name || "—"}
    </button>
  );
}

function DayCell({
  teamId, workDate, entries, canMutate, onEdit,
}: {
  teamId: number;
  workDate: string;
  entries: ScheduleEntry[];
  canMutate: boolean;
  onEdit: (target: EditTarget) => void;
}) {
  return (
    <div className="flex min-h-[3rem] flex-col gap-1">
      {entries.map((entry) => (
        <EntryChip
          key={entry.id}
          entry={entry}
          onClick={canMutate ? () => onEdit({ teamId, workDate, entry }) : undefined}
        />
      ))}
      {canMutate && (
        <button
          type="button"
          onClick={() => onEdit({ teamId, workDate, entry: null })}
          className="flex items-center justify-center rounded-md border border-dashed border-border py-1 text-veltol-fgMute transition-colors hover:border-veltol-accent/50 hover:text-veltol-accent"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function WeekNoteField({ teamId, note, canMutate }: { teamId: number; note: string; canMutate: boolean }) {
  const t = useTranslations("schedule");
  const [value, setValue] = useState(note);
  const [isPending, startTransition] = useTransition();

  function handleBlur() {
    if (value === note) return;
    startTransition(async () => {
      const weekStart = new URLSearchParams(window.location.search).get("week");
      if (!weekStart) return;
      const result = await upsertWeekNoteAction(teamId, weekStart, value);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
    });
  }

  if (!canMutate) {
    return <span className="text-[12px] text-veltol-fgDim">{note || "—"}</span>;
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      disabled={isPending}
      rows={2}
      className="min-w-[10rem] text-[12px]"
      placeholder={t("notesPlaceholder")}
    />
  );
}

export function ScheduleGrid({ rows, canMutate, searchProjects }: Props) {
  const t = useTranslations("schedule");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const dates = rows[0]?.days.map((d) => d.date) ?? [];

  return (
    <>
      <TableShell>
        <TableDesktopView>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                  {t("columns.team")}
                </th>
                {dates.map((date) => (
                  <th key={date} className="min-w-[9rem] px-3 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {formatDate(date, { weekday: "short", day: "2-digit", month: "2-digit", year: undefined })}
                  </th>
                ))}
                <th className="min-w-[10rem] px-3 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                  {t("columns.notes")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 2} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.team_id}>
                    <td className="px-5 py-3 align-top font-medium text-veltol-fg">
                      {row.team_name}
                    </td>
                    {row.days.map((day) => (
                      <td key={day.date} className="px-3 py-3 align-top">
                        <DayCell
                          teamId={row.team_id}
                          workDate={day.date}
                          entries={day.entries}
                          canMutate={canMutate}
                          onEdit={setEditTarget}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 align-top">
                      <WeekNoteField teamId={row.team_id} note={row.note} canMutate={canMutate} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : (
          <DataCardList>
            {rows.map((row) => (
              <DataCard key={row.team_id}>
                <DataCardHeader>
                  <div>
                    <DataCardTitle>{row.team_name}</DataCardTitle>
                  </div>
                </DataCardHeader>
                <DataCardBody>
                  {row.days.map((day) => (
                    <DataCardField
                      key={day.date}
                      label={formatDate(day.date, { weekday: "short", day: "2-digit", month: "2-digit", year: undefined })}
                    >
                      <DayCell
                        teamId={row.team_id}
                        workDate={day.date}
                        entries={day.entries}
                        canMutate={canMutate}
                        onEdit={setEditTarget}
                      />
                    </DataCardField>
                  ))}
                  <DataCardField label={t("columns.notes")}>
                    <WeekNoteField teamId={row.team_id} note={row.note} canMutate={canMutate} />
                  </DataCardField>
                </DataCardBody>
              </DataCard>
            ))}
          </DataCardList>
        )}
      </TableShell>

      {editTarget && (
        <ScheduleEntryDialog
          open
          onClose={() => setEditTarget(null)}
          teamId={editTarget.teamId}
          workDate={editTarget.workDate}
          entry={editTarget.entry}
          nextSortOrder={
            editTarget.entry
              ? editTarget.entry.sort_order
              : nextSortOrderForCell(
                  rows.flatMap((r) => r.days.flatMap((d) => d.entries)),
                  editTarget.teamId,
                  editTarget.workDate,
                )
          }
            searchProjects={searchProjects}
        />
      )}
    </>
  );
}
