"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils/formatDate";
import {
  addVacationAdjustment,
  deleteVacationAdjustment,
  setVacationAllowance,
} from "@/app/[locale]/(app)/vacation/actions";
import { MAX_CARRYOVER_DAYS } from "../types";
import type { VacationOverviewRow } from "../types";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

interface Props {
  open: boolean;
  row: VacationOverviewRow;
  year: number;
  onClose: () => void;
}

function SubjectFields({ row, year }: { row: VacationOverviewRow; year: number }) {
  return (
    <>
      <input type="hidden" name="subject_kind" value={row.subject.kind} />
      <input type="hidden" name="subject_id" value={String(row.subject.id)} />
      <input type="hidden" name="year" value={year} />
    </>
  );
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function EditAllowanceDialog({ open, row, year, onClose }: Props) {
  const t = useTranslations("vacation");
  const confirm = useConfirm();
  const [isDeleting, startDelete] = useTransition();
  const [allowanceState, allowanceAction, allowancePending] = useActionState(setVacationAllowance, null);
  const [adjustmentState, adjustmentAction, adjustmentPending] = useActionState(addVacationAdjustment, null);
  const adjustmentFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (allowanceState?.success) toast.success(t(allowanceState.success as Parameters<typeof t>[0]));
    else if (allowanceState?.error) toast.error(t(allowanceState.error as Parameters<typeof t>[0]));
  }, [allowanceState]);

  useEffect(() => {
    if (adjustmentState?.success) {
      toast.success(t(adjustmentState.success as Parameters<typeof t>[0]));
      adjustmentFormRef.current?.reset();
    } else if (adjustmentState?.error) toast.error(t(adjustmentState.error as Parameters<typeof t>[0]));
  }, [adjustmentState]);

  async function handleDelete(id: number) {
    const ok = await confirm({ title: t("confirmDeleteAdjustment") });
    if (!ok) return;
    startDelete(async () => {
      const result = await deleteVacationAdjustment(id);
      if (result?.error) toast.error(t(result.error as Parameters<typeof t>[0]));
      else if (result?.success) toast.success(t(result.success as Parameters<typeof t>[0]));
    });
  }

  function authorName(a: VacationOverviewRow["adjustments"][number]) {
    return [a.author?.first_name, a.author?.last_name].filter(Boolean).join(" ") || "—";
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("allowanceDialogTitle", { name: row.name, year })}
          </Dialog.Title>
          <p className="mt-2 font-mono text-[12px] text-veltol-fgMute">
            {t("overviewColumns.remaining")}: {row.balance.remainingDays} · {t("overviewColumns.carriedOver")}: +
            {row.balance.carriedOverDays} · {t("overviewColumns.used")}: {row.balance.usedDays}
          </p>

          <form action={allowanceAction} className="mt-6 space-y-2">
            <SubjectFields row={row} year={year} />
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("baseDays")}</Label>
            <div className="flex gap-3">
              <input
                key={`${row.balance.baseDays}-${year}`}
                name="base_days"
                type="number"
                min={0}
                step={0.5}
                required
                defaultValue={row.balance.baseDays}
                className={INPUT_CLASS}
              />
              <Button type="submit" disabled={allowancePending}>
                {allowancePending ? t("saving") : t("save")}
              </Button>
            </div>
            <p className="text-[12px] text-veltol-fgMute">
              {row.hasExplicitAllowance
                ? t("allowanceAppliesForward", { year })
                : t("allowanceInherited", { year, days: row.balance.baseDays })}
            </p>
            <p className="text-[12px] text-veltol-fgMute">{t("carryoverHint", { max: MAX_CARRYOVER_DAYS })}</p>
          </form>

          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-semibold text-veltol-fg">{t("adjustmentsTitle")}</h3>
            {row.adjustments.length === 0 ? (
              <p className="text-[12px] text-veltol-fgMute">{t("noAdjustments")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {row.adjustments.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-3 py-2.5">
                    <span
                      className={
                        a.days < 0
                          ? "w-12 shrink-0 font-mono text-sm text-veltol-red"
                          : "w-12 shrink-0 font-mono text-sm text-veltol-fg"
                      }
                    >
                      {signed(a.days)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm text-veltol-fgDim">{a.note}</p>
                      <p className="font-mono text-[11px] text-veltol-fgMute">
                        {authorName(a)} · {formatDate(a.created_at)}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={t("delete")}
                      disabled={isDeleting}
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <form ref={adjustmentFormRef} action={adjustmentAction} className="grid grid-cols-[6rem_1fr] gap-3 sm:grid-cols-[6rem_1fr_auto]">
              <SubjectFields row={row} year={year} />
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("adjustmentDays")}</Label>
                <input name="days" type="number" step={0.5} required className={INPUT_CLASS} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("adjustmentNote")}</Label>
                <input name="note" type="text" required maxLength={200} className={INPUT_CLASS} />
              </div>
              <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                <Button type="submit" variant="outline" disabled={adjustmentPending}>
                  {adjustmentPending ? t("saving") : t("addAdjustment")}
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-8 flex justify-end">
            <Dialog.Close render={<Button type="button" variant="outline">{t("close")}</Button>} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
