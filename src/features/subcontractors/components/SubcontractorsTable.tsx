"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Pagination } from "@/shared/components/ui/pagination";
import { Link } from "@/i18n/navigation";
import { AddSubcontractorDialog } from "./AddSubcontractorDialog";
import { EditSubcontractorDialog } from "./EditSubcontractorDialog";
import { deleteSubcontractorAction } from "@/app/[locale]/(app)/subcontractors/actions";
import { useSubcontractorsStore } from "../hooks/useSubcontractorsStore";
import { formatDate } from "@/shared/utils/formatDate";
import type { SubcontractorWithProjects } from "../types";

const PAGE_SIZE = 20;

interface Props {
  subcontractors: SubcontractorWithProjects[];
  canMutate: boolean;
}

export function SubcontractorsTable({ subcontractors, canMutate }: Props) {
  const t = useTranslations("subcontractors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);

  const {
    isAddDialogOpen, editingSubcontractor, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useSubcontractorsStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(subcontractors.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedSubcontractors = subcontractors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function formatPrice(v: number | null, currency: string) {
    if (v == null) return "—";
    return `${new Intl.NumberFormat("hu-HU").format(v)} ${currency}`;
  }

  function handleDelete(subcontractorId: number) {
    if (!confirm(t("confirmDelete"))) return;
    setDeleteError(null);
    setDeletingId(subcontractorId);
    startTransition(async () => {
      const result = await deleteSubcontractorAction(subcontractorId);
      setDeletingId(null);
      if (result?.error) {
        setDeleteError({ id: subcontractorId, message: t(result.error as Parameters<typeof t>[0]) });
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-xs font-medium text-veltol-fgMute">
            {t("totalCount", { count: subcontractors.length })}
          </span>
          {canMutate && (
            <Button onClick={openAddDialog} variant="outline">
              <Plus data-icon="inline-start" />
              {t("addSubcontractor")}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  t("columns.name"), t("columns.contactPerson"), t("columns.phone"),
                  t("columns.projects"), "",
                ].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subcontractors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                pagedSubcontractors.map((sub) => (
                  <tr key={sub.id} className="group transition-colors hover:bg-veltol-surface/50">
                    <td className="px-5 py-3.5 align-top">
                      <div className="font-medium text-veltol-fg">{sub.name}</div>
                    </td>

                    <td className="px-5 py-3.5 align-top text-[12px] text-veltol-fgDim">
                      {sub.contact_person ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 align-top font-mono text-[11px] text-veltol-fgDim">
                      {sub.phone ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      {sub.assignments.length === 0 ? (
                        <span className="text-[12px] text-veltol-fgMute">{t("noProjects")}</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {sub.assignments.map((a) => (
                            <div key={a.id} className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/projects/${a.project.id}`}
                                className="text-[12px] font-medium text-veltol-accent hover:underline"
                              >
                                {a.project.name}
                              </Link>
                              <Badge variant={a.is_current ? "default" : "secondary"}>
                                {a.is_current ? t("current") : t("past")}
                              </Badge>
                              <span className="font-mono text-[11px] text-veltol-fgMute">
                                {formatPrice(a.price_eur, "€")} · {formatPrice(a.price_lei, "Lei")}
                              </span>
                              <span className="font-mono text-[11px] text-veltol-fgMute">
                                {formatDate(a.start_date) || "—"} → {formatDate(a.deadline) || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 align-top">
                      {canMutate && (
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            title={t("editSubcontractor")}
                            onClick={() => openEditDialog(sub)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            title={t("deleteSubcontractor")}
                            disabled={isPending && deletingId === sub.id}
                            onClick={() => handleDelete(sub.id)}
                          >
                            {isPending && deletingId === sub.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                          {deleteError?.id === sub.id && (
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

      <AddSubcontractorDialog
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingSubcontractor && (
        <EditSubcontractorDialog
          subcontractor={editingSubcontractor}
          open={!!editingSubcontractor}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
