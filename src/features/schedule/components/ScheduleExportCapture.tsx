"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { formatDate } from "@/shared/utils/formatDate";
import { weekEnd } from "../services/scheduleService";
import { memberInitials } from "../utils/memberInitials";
import type { TeamScheduleRow } from "../types";

interface Props {
  rows: TeamScheduleRow[];
  weekStart: string;
}

export const ScheduleExportCapture = forwardRef<HTMLDivElement, Props>(function ScheduleExportCapture(
  { rows, weekStart },
  ref,
) {
  const t = useTranslations("schedule");
  const dates = rows[0]?.days.map((d) => d.date) ?? [];

  return (
    <div className="pointer-events-none fixed top-0 left-[-10000px]" aria-hidden>
      <div ref={ref} className="w-[1400px] bg-white p-8">
        <div className="mb-4">
          <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-veltol-fg">{t("title")}</h1>
          <p className="mt-1 text-sm text-veltol-fgMute">
            {formatDate(weekStart, { year: undefined })} – {formatDate(weekEnd(weekStart), { year: undefined })}
          </p>
        </div>

        <table className="w-full border-collapse text-[13px]">
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
            {rows.map((row) => (
              <tr key={row.team_id}>
                <td className="px-5 py-3 align-top font-medium text-veltol-fg">{row.team_name}</td>
                {row.days.map((day) => (
                  <td key={day.date} className="px-3 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      {day.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="truncate rounded-md border border-border px-1.5 py-1 text-left text-[11px] leading-tight text-veltol-fg"
                          style={
                            entry.color
                              ? { backgroundColor: `${entry.color}22`, borderColor: `${entry.color}55` }
                              : undefined
                          }
                        >
                          {entry.label || entry.project?.name || "—"}
                        </div>
                      ))}
                    </div>
                  </td>
                ))}
                <td className="px-3 py-3 align-top text-[12px] text-veltol-fgDim">{row.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-veltol-fg">{t("roster.title")}</h2>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                  {t("columns.team")}
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                  {t("roster.members")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.team_id} className="align-top">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-veltol-fg">{row.team_name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {row.members.length === 0 ? (
                      <span className="text-[12px] text-veltol-fgMute">{t("roster.emptyMembers")}</span>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {row.members.map((member) => (
                          <div key={member.id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarFallback className="grad-blue text-[9px] font-bold text-white">
                                {memberInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[12px] text-veltol-fgDim">{member.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
