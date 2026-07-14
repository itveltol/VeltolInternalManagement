"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FileCheck2, Pencil, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { cancelVacationRequest } from "@/app/[locale]/(app)/vacation/actions";
import { useVacationStore } from "../hooks/useVacationStore";
import { vacationDays } from "../types";
import { canEdit } from "../services/vacationService";
import { RequestVacationDialog } from "./RequestVacationDialog";
import { ApprovalDialog } from "./ApprovalDialog";
import { vacationStatusVariant } from "@/shared/utils/status-variant";
import type { VacationRequest, VacationStatus, VacationBalance } from "../types";
import type { Profile } from "@/features/profile/types";
import type { Holiday } from "@/features/holidays/types";

const PAGE_SIZE = 20;

interface Props {
  requests: VacationRequest[];
  isAdmin: boolean;
  currentUserId: string;
  balance: VacationBalance | null;
  employees: Profile[];
  holidays: Holiday[];
}

export function VacationTable({ requests, isAdmin, currentUserId, balance, employees, holidays }: Props) {
  const t = useTranslations("vacation");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  const {
    isAddDialogOpen, editingRequest, approvingRequest,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    openApprovalDialog, closeApprovalDialog,
  } = useVacationStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedRequests = requests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    window.open(`/api/vacation/${id}/document`, "_blank");
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="text-xs font-medium text-veltol-fgMute">
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
              <tr className="border-b border-border">
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
                    className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                pagedRequests.map((req) => (
                  <tr key={req.id} className="group transition-colors hover:bg-veltol-surface/50">
                    <td className="px-5 py-3.5 text-veltol-fg">{personName(req.requester)}</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {formatDate(req.start_date)}
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {formatDate(req.end_date)}
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {vacationDays(req.start_date, req.end_date, holidaySet)}
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
                      <div className="flex flex-col items-center gap-1">
                        {canEdit(req, currentUserId) && (
                          <>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              title={t("edit")}
                              onClick={() => openEditDialog(req)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="destructive"
                              title={t("cancel")}
                              disabled={isPending}
                              onClick={() => handleCancel(req.id)}
                            >
                              <X />
                            </Button>
                          </>
                        )}
                        {isAdmin && req.status === "pending" && (
                          <Button
                            size="icon-sm"
                            variant="outline"
                            title={t("review")}
                            onClick={() => openApprovalDialog(req)}
                          >
                            <ClipboardCheck />
                          </Button>
                        )}
                        {req.status === "approved" &&
                          (isAdmin || req.user_id === currentUserId) && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title={t("generateDocument")}
                              disabled={isPending}
                              onClick={() => handleGenerate(req.id)}
                            >
                              <FileCheck2 />
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

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
          pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
        />
      </div>

      <RequestVacationDialog
        open={isAddDialogOpen}
        balance={balance}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        employees={employees}
        holidays={holidays}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingRequest && (
        <RequestVacationDialog
          open={!!editingRequest}
          request={editingRequest}
          balance={balance}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          employees={employees}
          holidays={holidays}
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
          holidays={holidays}
          onClose={() => {
            closeApprovalDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
