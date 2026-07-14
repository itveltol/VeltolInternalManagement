"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { createVacationRequest, updateVacationRequest } from "@/app/[locale]/(app)/vacation/actions";
import { VACATION_LEAVE_TYPES, workingDaysCount } from "../types";
import type { VacationRequest, VacationBalance } from "../types";
import type { Profile } from "@/features/profile/types";
import type { Holiday } from "@/features/holidays/types";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none";

interface Props {
  open: boolean;
  request?: VacationRequest;
  balance?: VacationBalance | null;
  isAdmin?: boolean;
  currentUserId?: string;
  employees?: Profile[];
  holidays?: Holiday[];
  onClose: () => void;
}

export function RequestVacationDialog({
  open,
  request,
  balance,
  isAdmin,
  currentUserId,
  employees,
  holidays = [],
  onClose,
}: Props) {
  const t = useTranslations("vacation");
  const isEdit = !!request;
  const action = isEdit ? updateVacationRequest : createVacationRequest;

  const [state, formAction, pending] = useActionState(action, null);
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const [startDate, setStartDate] = useState(request?.start_date ?? "");
  const [endDate, setEndDate] = useState(request?.end_date ?? "");

  const days =
    startDate && endDate && endDate >= startDate
      ? workingDaysCount(startDate, endDate, holidaySet)
      : null;
  const hasNoWorkingDays = days === 0;

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {isEdit ? t("editRequest") : t("requestVacation")}
          </Dialog.Title>

          {balance && (
            <p className="mt-3 font-mono text-[12px] text-veltol-fgMute">
              {t("yourBalance")}: {balance.remainingDays} / {balance.baseDays + balance.carriedOverDays}
            </p>
          )}

          <form action={formAction} className="mt-6 space-y-4">
            {isEdit && <input type="hidden" name="id" value={request.id} />}

            {!isEdit && isAdmin && employees && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("assignTo")}</Label>
                <select
                  name="user_id"
                  defaultValue={currentUserId}
                  className={INPUT_CLASS}
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {[employee.first_name, employee.last_name].filter(Boolean).join(" ") || employee.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("startDate")} *</Label>
                <input
                  name="start_date"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("endDate")} *</Label>
                <input
                  name="end_date"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {days !== null && (
              <p
                className={
                  hasNoWorkingDays
                    ? "text-sm text-veltol-red"
                    : "font-mono text-[12px] text-veltol-fgMute"
                }
              >
                {hasNoWorkingDays
                  ? t("errorNoWorkingDays")
                  : t("workingDaysCount", { count: days })}
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("leaveType")} *</Label>
              <select
                name="leave_type"
                required
                defaultValue={request?.leave_type ?? "rest"}
                className={INPUT_CLASS}
              >
                {VACATION_LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`leaveType_${type}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("reason")}</Label>
              <textarea
                name="reason"
                rows={3}
                defaultValue={request?.reason ?? ""}
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("jobTitle")}</Label>
                <input
                  name="job_title"
                  type="text"
                  defaultValue={request?.job_title ?? ""}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("superiorName")}</Label>
                <input
                  name="superior_name"
                  type="text"
                  defaultValue={request?.superior_name ?? ""}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("substituteName")}</Label>
              <input
                name="substitute_name"
                type="text"
                defaultValue={request?.substitute_name ?? ""}
                className={INPUT_CLASS}
              />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">
                {t(state.error as Parameters<typeof t>[0])}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("dismiss")}</Button>} />
              <Button type="submit" disabled={pending || hasNoWorkingDays}>
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
