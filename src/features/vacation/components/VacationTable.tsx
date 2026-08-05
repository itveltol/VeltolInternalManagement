"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, FileCheck2, Pencil, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle,
  DataCardBadgeSlot, DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { cancelVacationRequest } from "@/app/[locale]/(app)/vacation/actions";
import { useVacationStore } from "../hooks/useVacationStore";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { vacationDays } from "../types";
import { canEdit } from "../services/vacationService";
import { RequestVacationDialog } from "./RequestVacationDialog";
import { ApprovalDialog } from "./ApprovalDialog";
import { vacationStatusVariant } from "@/shared/utils/status-variant";
import { formatDate } from "@/shared/utils/formatDate";
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
  const router = useRouter();
  const confirm = useConfirm();
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

  function personName(p: { first_name: string | null; last_name: string | null } | null) {
    if (!p) return "—";
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
    return name || "—";
  }

  async function handleCancel(id: number) {
    const ok = await confirm({ title: t("confirmCancel") });
    if (!ok) return;
    startTransition(async () => {
      const result = await cancelVacationRequest(id);
      if (result?.error) toast.error(t(result.error as "errorGeneric"));
      else if (result?.success) toast.success(t(result.success as "requestCancelled"));
      router.refresh();
    });
  }

  function handleGenerate(id: number) {
    window.open(`/api/vacation/${id}/document`, "_blank");
  }

  return (
    <>
      <TableShell>
        <TableToolbar>
          <div>
            <span className="text-xs font-medium text-veltol-fgMute">
              {t("totalCount", { count: requests.length })}
            </span>
          </div>
          <Button onClick={openAddDialog} variant="outline">
            {t("requestVacation")}
          </Button>
        </TableToolbar>

        <TableDesktopView>
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
                      {formatDate(req.start_date) || "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">
                      {formatDate(req.end_date) || "—"}
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
                      {formatDate(req.created_at) || "—"}
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
        </TableDesktopView>

        {requests.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : (
          <DataCardList>
            {pagedRequests.map((req) => (
              <DataCard key={req.id}>
                <DataCardHeader>
                  <DataCardTitle>{personName(req.requester)}</DataCardTitle>
                  <DataCardBadgeSlot>
                    <Badge variant={vacationStatusVariant(req.status)}>
                      {t(`status_${req.status}` as Parameters<typeof t>[0])}
                    </Badge>
                  </DataCardBadgeSlot>
                </DataCardHeader>

                <DataCardBody>
                  <DataCardField label={t("columns.startDate")}>{formatDate(req.start_date) || "—"}</DataCardField>
                  <DataCardField label={t("columns.endDate")}>{formatDate(req.end_date) || "—"}</DataCardField>
                  <DataCardField label={t("columns.days")}>
                    {vacationDays(req.start_date, req.end_date, holidaySet)}
                  </DataCardField>
                  <DataCardField label={t("columns.requestedOn")}>{formatDate(req.created_at) || "—"}</DataCardField>
                  <DataCardField label={t("columns.approvedBy")} full>{personName(req.approver)}</DataCardField>
                </DataCardBody>

                {(canEdit(req, currentUserId) ||
                  (isAdmin && req.status === "pending") ||
                  (req.status === "approved" && (isAdmin || req.user_id === currentUserId))) && (
                  <DataCardFooter className="flex-wrap">
                    {canEdit(req, currentUserId) && (
                      <>
                        <Button variant="outline" className="flex-1" onClick={() => openEditDialog(req)}>
                          <Pencil data-icon="inline-start" /> {t("edit")}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={isPending}
                          onClick={() => handleCancel(req.id)}
                        >
                          <X data-icon="inline-start" /> {t("cancel")}
                        </Button>
                      </>
                    )}
                    {isAdmin && req.status === "pending" && (
                      <Button variant="outline" className="flex-1" onClick={() => openApprovalDialog(req)}>
                        <ClipboardCheck data-icon="inline-start" /> {t("review")}
                      </Button>
                    )}
                    {req.status === "approved" &&
                      (isAdmin || req.user_id === currentUserId) && (
                        <Button
                          variant="ghost"
                          className="flex-1"
                          disabled={isPending}
                          onClick={() => handleGenerate(req.id)}
                        >
                          <FileCheck2 data-icon="inline-start" /> {t("generateDocument")}
                        </Button>
                      )}
                  </DataCardFooter>
                )}
              </DataCard>
            ))}
          </DataCardList>
        )}

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
          pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
        />
      </TableShell>

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
