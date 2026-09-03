"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { upsertAssignmentDayAction } from "@/app/[locale]/(app)/schedule/actions";
import { formatDate } from "@/shared/utils/formatDate";
import type { ScheduleAssignmentDay } from "../types";

interface Props {
  assignmentId: number;
  day: ScheduleAssignmentDay;
  canMutate: boolean;
}

export function AssignmentDayRow({ assignmentId, day, canMutate }: Props) {
  const [delegated, setDelegated] = useState(day.delegated);
  const [plusHours, setPlusHours] = useState(String(day.plus_hours || ""));
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("schedule");
  const onVacation = day.assignees.some((a) => a.onVacation);
  const disabled = !canMutate || onVacation || isPending;

  function save(next: { delegated: boolean; plus_hours: number }) {
    startTransition(async () => {
      const result = await upsertAssignmentDayAction(assignmentId, day.work_date, next);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
    });
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md border border-border px-2.5 py-2 ${
        onVacation ? "bg-veltol-fgMute/10 opacity-60" : ""
      }`}
      title={onVacation ? t("entry.onVacation") : undefined}
    >
      <span className="text-[12px] text-veltol-fgDim">
        {formatDate(day.work_date, { weekday: "short", day: "2-digit", month: "2-digit", year: undefined })}
      </span>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-veltol-fgDim">
          <input
            type="checkbox"
            checked={delegated}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.checked;
              setDelegated(next);
              save({ delegated: next, plus_hours: Number(plusHours) || 0 });
            }}
            className="h-3.5 w-3.5 rounded border-border"
          />
          {t("entry.delegation")}
        </label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={plusHours}
          disabled={disabled}
          onChange={(e) => setPlusHours(e.target.value)}
          onBlur={() => save({ delegated, plus_hours: Number(plusHours) || 0 })}
          placeholder={t("entry.plusHoursPlaceholder")}
          className="w-16 rounded-md border border-border bg-veltol-surface/60 px-1.5 py-0.5 text-[11px] text-veltol-fg outline-none focus:border-veltol-accent/50"
        />
      </div>
    </div>
  );
}
