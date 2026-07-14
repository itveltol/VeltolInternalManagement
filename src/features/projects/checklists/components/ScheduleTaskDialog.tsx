"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { scheduleChecklistItemAction } from "@/app/[locale]/(app)/projects/[id]/actions";
import type { ChecklistRow } from "@/features/projects/checklists/types";
import type { Team } from "@/features/teams/types";

const INPUT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const SELECT_CLASS = INPUT_CLASS + " font-mono";

interface Props {
  row: ChecklistRow;
  projectId: number;
  teams: Team[];
  open: boolean;
  onClose: () => void;
}

export function ScheduleTaskDialog({ row, projectId, teams, open, onClose }: Props) {
  const t = useTranslations("checklist");
  const [startDate, setStartDate] = useState(row.record?.start_date ?? "");
  const [endDate, setEndDate] = useState(row.record?.end_date ?? "");
  const [teamId, setTeamId] = useState(row.record?.team_id != null ? String(row.record.team_id) : "");
  const [state, action, pending] = useActionState(scheduleChecklistItemAction, null);

  useEffect(() => {
    setStartDate(row.record?.start_date ?? "");
    setEndDate(row.record?.end_date ?? "");
    setTeamId(row.record?.team_id != null ? String(row.record.team_id) : "");
  }, [row]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("gantt.scheduleTask")}
          </Dialog.Title>
          <p className="mt-1 text-sm text-veltol-fgDim">{row.activitate}</p>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="item_number" value={row.number} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("gantt.startDate")}</Label>
                <input
                  name="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("gantt.endDate")}</Label>
                <input
                  name="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("gantt.team")}</Label>
              <select
                name="team_id"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="" className="bg-card">{t("gantt.noTeam")}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id} className="bg-card">
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("gantt.cancel")}</Button>} />
              <Button type="submit" disabled={pending}>{pending ? t("gantt.saving") : t("gantt.save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
