"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cancelVacationRequest, generateVacationDocument } from "@/app/[locale]/(app)/vacation/actions";
import { useVacationStore } from "../hooks/useVacationStore";
import { vacationDays } from "../types";
import { canEdit } from "../services/vacationService";
import { RequestVacationDialog } from "./RequestVacationDialog";
import { ApprovalDialog } from "./ApprovalDialog";
import { vacationStatusVariant } from "@/shared/utils/status-variant";
import type { VacationRequest, VacationStatus } from "../types";

interface Props {
  requests: VacationRequest[];
  isAdmin: boolean;
  currentUserId: string;
}

export function VacationTable({ requests, isAdmin, currentUserId }: Props) {
  const t = useTranslations("vacation");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, editingRequest, approvingRequest,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    openApprovalDialog, closeApprovalDialog,
  } = useVacationStore();

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  }

  function personName(p: { first_name: string | null; last_name: string | null } | null) {
    if (!p) return "—";
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
    return name || "—";
  }

  function handleCancel(id: number) {
    if (!confirm(t("confirmCancel"))) return;
    startTransition(async () => {
      await cancelVacationRequest(id);
      router.refresh();
    });
  }

  function handleGenerate(id: number) {
    startTransition(async () => {
      await generateVacationDocument(id);
    });
  }

  return (
    <>
      <div className="v-panel v-hairline overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <span className="mono-label text-[10px] text-veltol-fgMute">
              {t("totalCount", { count: requests.length })}
            </span>
          </div>
          <Button onClick={openAddDialog} variant="outline">
            {t("requestVacation")}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {[
                  t("columns.employee"),
                  t("columns.startDate"),
                  t("columns.endDate"),
                  t("columns.days"),
                  t("columns.status"),
                  t("columns.requestedOn"),
                  t("columns.approvedBy"),
                  "",
                ].map((col, i) => (
                  <th
                    key={i}
                    className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="group transition-colors hover:bg-veltol-surface/30">
                    <td className="px-5 py-3.5 text-veltol-fg">{personName(req.requester)}</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {formatDate(req.start_date)}
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {formatDate(req.end_date)}
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {vacationDays(req.start_date, req.end_date)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={vacationStatusVariant(req.status)}>
                        {t(`status_${req.status}` as Parameters<typeof t>[0])}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgMute">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">
                      {personName(req.approver)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {canEdit(req, currentUserId) && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(req)}>
                              {t("edit")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isPending}
                              onClick={() => handleCancel(req.id)}
                            >
                              {t("cancel")}
                            </Button>
                          </>
                        )}
                        {isAdmin && req.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => openApprovalDialog(req)}>
                            {t("review")}
                          </Button>
                        )}
                        {req.status === "approved" &&
                          (isAdmin || req.user_id === currentUserId) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => handleGenerate(req.id)}
                            >
                              {t("generateDocument")}
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RequestVacationDialog
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingRequest && (
        <RequestVacationDialog
          open={!!editingRequest}
          request={editingRequest}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}

      {approvingRequest && (
        <ApprovalDialog
          open={!!approvingRequest}
          request={approvingRequest}
          onClose={() => {
            closeApprovalDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
