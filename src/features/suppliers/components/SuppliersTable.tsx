"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardTitle,
  DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { AddSupplierDialog } from "./AddSupplierDialog";
import { EditSupplierDialog } from "./EditSupplierDialog";
import { deleteSupplierAction } from "@/app/[locale]/(app)/suppliers/actions";
import { useSuppliersStore } from "../hooks/useSuppliersStore";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import type { Supplier } from "../types";

const PAGE_SIZE = 20;

interface Props {
  suppliers: Supplier[];
  canMutate: boolean;
}

export function SuppliersTable({ suppliers, canMutate }: Props) {
  const t = useTranslations("suppliers");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);

  const {
    isAddDialogOpen, editingSupplier, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useSuppliersStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(suppliers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedSuppliers = suppliers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleDelete(supplierId: number) {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("deleteSupplier") });
    if (!ok) return;
    setDeleteError(null);
    setDeletingId(supplierId);
    startTransition(async () => {
      const result = await deleteSupplierAction(supplierId);
      setDeletingId(null);
      if (result?.error) {
        setDeleteError({ id: supplierId, message: t(result.error as Parameters<typeof t>[0]) });
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <TableShell>
        <TableToolbar>
          <span className="text-xs font-medium text-veltol-fgMute">
            {t("totalCount", { count: suppliers.length })}
          </span>
          {canMutate && (
            <Button onClick={openAddDialog} variant="outline">
              <Plus data-icon="inline-start" />
              {t("addSupplier")}
            </Button>
          )}
        </TableToolbar>

        <TableDesktopView>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  t("columns.name"), t("columns.cui"), t("columns.contactPerson"),
                  t("columns.phone"), t("columns.email"), "",
                ].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                pagedSuppliers.map((s) => (
                  <tr key={s.id} className="group transition-colors hover:bg-veltol-surface/50">
                    <td className="px-5 py-3.5 align-top">
                      <div className="font-medium text-veltol-fg">{s.name}</div>
                    </td>
                    <td className="px-5 py-3.5 align-top font-mono text-[11px] text-veltol-fgDim">
                      {s.cui ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 align-top text-[12px] text-veltol-fgDim">
                      {s.contact_person ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 align-top font-mono text-[11px] text-veltol-fgDim">
                      {s.phone ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 align-top font-mono text-[11px] text-veltol-fgDim">
                      {s.email ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 align-top">
                      {canMutate && (
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            title={t("editSupplier")}
                            onClick={() => openEditDialog(s)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            title={t("deleteSupplier")}
                            disabled={isPending && deletingId === s.id}
                            onClick={() => handleDelete(s.id)}
                          >
                            {isPending && deletingId === s.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                          {deleteError?.id === s.id && (
                            <p className="max-w-[10rem] text-center text-[10px] text-veltol-red">{deleteError.message}</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {suppliers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : (
          <DataCardList>
            {pagedSuppliers.map((s) => (
              <DataCard key={s.id}>
                <DataCardTitle>{s.name}</DataCardTitle>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <DataCardField label={t("columns.cui")}>{s.cui ?? "—"}</DataCardField>
                  <DataCardField label={t("columns.contactPerson")}>{s.contact_person ?? "—"}</DataCardField>
                  <DataCardField label={t("columns.phone")}>{s.phone ?? "—"}</DataCardField>
                  <DataCardField label={t("columns.email")}>{s.email ?? "—"}</DataCardField>
                </div>

                {canMutate && (
                  <DataCardFooter className="flex-col items-stretch gap-2">
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => openEditDialog(s)}>
                        <Pencil data-icon="inline-start" /> {t("editSupplier")}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={isPending && deletingId === s.id}
                        onClick={() => handleDelete(s.id)}
                      >
                        {isPending && deletingId === s.id ? <Loader2 className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                        {t("deleteSupplier")}
                      </Button>
                    </div>
                    {deleteError?.id === s.id && (
                      <p className="text-center text-[11px] text-veltol-red">{deleteError.message}</p>
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

      <AddSupplierDialog
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingSupplier && (
        <EditSupplierDialog
          supplier={editingSupplier}
          open={!!editingSupplier}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
