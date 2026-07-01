"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { approveVacationRequest, rejectVacationRequest } from "@/app/[locale]/(app)/vacation/actions";
import { vacationStatusVariant } from "@/shared/utils/status-variant";
import { vacationDays } from "../types";
import type { VacationRequest } from "../types";

interface Props {
  open: boolean;
  request: VacationRequest;
  onClose: () => void;
}

export function ApprovalDialog({ open, request, onClose }: Props) {
  const t = useTranslations("vacation");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "long", day: "numeric" },
    );
  }

  function personName(p: { first_name: string | null; last_name: string | null } | null) {
    if (!p) return "—";
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
  }

  function handleApprove() {
    startTransition(async () => {
      await approveVacationRequest(request.id);
      onClose();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectVacationRequest(request.id);
      onClose();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-veltol-deep p-8 shadow-2xl">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {t("reviewRequest")}
          </Dialog.Title>

          <div className="mt-6 space-y-3 rounded-lg border border-white/[0.06] bg-veltol-surface/30 p-4">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[9px] text-veltol-fgMute">{t("columns.employee")}</span>
              <span className="text-sm text-veltol-fg">{personName(request.requester)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="mono-label text-[9px] text-veltol-fgMute">{t("period")}</span>
              <span className="font-mono text-[12px] text-veltol-fgDim">
                {formatDate(request.start_date)} → {formatDate(request.end_date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="mono-label text-[9px] text-veltol-fgMute">{t("columns.days")}</span>
              <span className="font-mono tabular-nums text-sm text-veltol-fg">
                {vacationDays(request.start_date, request.end_date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="mono-label text-[9px] text-veltol-fgMute">{t("columns.status")}</span>
              <Badge variant={vacationStatusVariant(request.status)}>
                {t(`status_${request.status}` as Parameters<typeof t>[0])}
              </Badge>
            </div>
            {request.reason && (
              <div className="space-y-1">
                <span className="mono-label text-[9px] text-veltol-fgMute">{t("reason")}</span>
                <p className="text-sm text-veltol-fgDim">{request.reason}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close render={<Button type="button" variant="outline">{t("dismiss")}</Button>} />
            <Button variant="destructive" disabled={isPending} onClick={handleReject}>
              {t("reject")}
            </Button>
            <Button disabled={isPending} onClick={handleApprove}>
              {t("approve")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
