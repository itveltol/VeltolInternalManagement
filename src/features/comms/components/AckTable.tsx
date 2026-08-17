"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { canSendReminder } from "../services/notes";
import { sendAckReminderAction } from "@/app/[locale]/(app)/announcements/actions";
import type { AckSummary } from "../types";

interface Props {
  noteId: number;
  summary: AckSummary;
  lastReminderAt: string | null;
}

export function AckTable({ noteId, summary, lastReminderAt }: Props) {
  const t = useTranslations("comms");
  const format = useFormatter();
  const [reminderAt, setReminderAt] = useState(lastReminderAt);
  const [isPending, startTransition] = useTransition();

  const canRemind = summary.unconfirmed.length > 0 && canSendReminder(reminderAt, new Date());

  function handleSendReminder() {
    startTransition(async () => {
      const result = await sendAckReminderAction(noteId);
      if (result?.success) {
        toast.success(t(`announcements.${result.success}` as "announcements.reminderSent"));
        setReminderAt(new Date().toISOString());
      } else if (result?.error === "reminderRateLimited") {
        toast.error(t("announcements.reminderRateLimited"));
      } else if (result?.error) {
        toast.error(t(result.error as "errorGeneric"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold uppercase tracking-[.06em] text-veltol-fgMute">
          {t("announcements.ackTableTitle", { acknowledged: summary.acknowledged, total: summary.total })}
        </h3>
        {summary.unconfirmed.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <Button size="sm" variant="outline" disabled={!canRemind || isPending} onClick={handleSendReminder}>
              {t("announcements.sendReminder")}
            </Button>
            {reminderAt && (
              <span className="text-[11px] text-veltol-fgMute">
                {t("announcements.lastReminderAt", {
                  date: format.dateTime(new Date(reminderAt), { dateStyle: "short", timeStyle: "short" }),
                })}
              </span>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-veltol-fg">
          {t("announcements.unconfirmedTitle", { count: summary.unconfirmed.length })}
        </div>
        {summary.unconfirmed.length === 0 ? (
          <p className="text-[13px] text-veltol-fgMute">{t("announcements.allConfirmed")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {summary.unconfirmed.map((r) => (
              <li
                key={r.profile_id}
                className="rounded-lg border border-[var(--v-warning)]/30 bg-[var(--v-warning-bg)] px-3 py-2 text-[13px] font-medium text-veltol-fg"
              >
                {r.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-veltol-fgMute">
          {t("announcements.confirmedTitle", { count: summary.confirmed.length })}
        </div>
        {summary.confirmed.length === 0 ? (
          <p className="text-[13px] text-veltol-fgMute">—</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {summary.confirmed.map((r) => (
              <li
                key={r.profile_id}
                className="flex items-center justify-between rounded-lg border border-border bg-veltol-surface/60 px-3 py-2 text-[13px] text-veltol-fgDim"
              >
                <span>{r.name}</span>
                <span className="text-[11px] text-veltol-fgMute">
                  {format.dateTime(new Date(r.acknowledged_at as string), { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
