"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Pagination } from "@/shared/components/ui/pagination";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { WorkerFormDialog } from "@/features/teams/components/WorkerFormDialog";
import { removeWorkerAction } from "@/app/[locale]/(app)/teams/[id]/actions";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import type { OutfieldWorkerRow } from "@/app/[locale]/(app)/profile/actions";

const PAGE_SIZE = 10;

function workerName(w: OutfieldWorkerRow): string {
  return `${w.first_name} ${w.last_name ?? ""}`.trim();
}

function workerInitials(w: OutfieldWorkerRow): string {
  const f = w.first_name[0] ?? "";
  const l = w.last_name?.[0] ?? "";
  return (f + l || "?").toUpperCase();
}

interface Props {
  workers: OutfieldWorkerRow[];
  teams: { id: number; name: string }[];
}

export function OutfieldWorkersTable({ workers, teams }: Props) {
  const t = useTranslations("teams");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [removingWorkerId, setRemovingWorkerId] = useState<number | null>(null);
  const [editingWorker, setEditingWorker] = useState<OutfieldWorkerRow | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(workers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedWorkers = workers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleRemove(worker: OutfieldWorkerRow) {
    const ok = await confirm({ title: t("confirmRemoveWorker"), confirmLabel: t("removeWorker") });
    if (!ok) return;
    setRemovingWorkerId(worker.id);
    startTransition(async () => {
      const result = await removeWorkerAction(worker.id, worker.team_id);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else if (result?.success) toast.success(t(result.success as "workerRemoved"));
      setRemovingWorkerId(null);
      router.refresh();
    });
  }

  function closeDialog() {
    setEditingWorker(null);
    setAddDialogOpen(false);
    router.refresh();
  }

  return (
    <>
      <TableShell>
        <TableToolbar>
          <div>
            <div className="text-[11px] font-medium text-veltol-fgMute">{t("outfieldWorkersEyebrow")}</div>
            <h2 className="mt-0.5 text-lg font-semibold text-veltol-fg">{t("outfieldWorkersTitle")}</h2>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            {t("addWorker")}
          </Button>
        </TableToolbar>

        <TableDesktopView>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[t("columns.worker"), t("columns.phone"), t("columns.team"), t("columns.notes"), ""].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyWorkers")}
                  </td>
                </tr>
              ) : (
                pagedWorkers.map((w) => (
                  <tr key={w.id} className="group transition-colors hover:bg-veltol-surface/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="grad-blue text-[10px] font-bold text-white">
                            {workerInitials(w)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-veltol-fg">{workerName(w) || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-veltol-fgDim">{w.phone}</td>
                    <td className="px-5 py-3.5 text-veltol-fgDim">{w.team_name || "—"}</td>
                    <td className="px-5 py-3.5 text-veltol-fgDim">{w.notes}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingWorker(w)}>
                          {t("editWorker")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isPending && removingWorkerId === w.id}
                          onClick={() => handleRemove(w)}
                        >
                          {isPending && removingWorkerId === w.id ? "..." : t("removeWorker")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {workers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyWorkers")}</p>
        ) : (
          <DataCardList>
            {pagedWorkers.map((w) => (
              <DataCard key={w.id}>
                <DataCardHeader>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="grad-blue text-[10px] font-bold text-white">
                        {workerInitials(w)}
                      </AvatarFallback>
                    </Avatar>
                    <DataCardTitle>{workerName(w) || "—"}</DataCardTitle>
                  </div>
                </DataCardHeader>

                <DataCardField label={t("columns.phone")}>{w.phone}</DataCardField>
                <DataCardField label={t("columns.team")}>{w.team_name || "—"}</DataCardField>
                {w.notes && <DataCardField label={t("columns.notes")}>{w.notes}</DataCardField>}

                <DataCardFooter>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingWorker(w)}>
                    {t("editWorker")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={isPending && removingWorkerId === w.id}
                    onClick={() => handleRemove(w)}
                  >
                    {isPending && removingWorkerId === w.id ? "..." : t("removeWorker")}
                  </Button>
                </DataCardFooter>
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

      {editingWorker && (
        <WorkerFormDialog
          key={editingWorker.id}
          open={!!editingWorker}
          onClose={closeDialog}
          teams={teams}
          worker={editingWorker}
        />
      )}

      <WorkerFormDialog
        open={addDialogOpen}
        onClose={closeDialog}
        teams={teams}
        worker={null}
      />
    </>
  );
}
