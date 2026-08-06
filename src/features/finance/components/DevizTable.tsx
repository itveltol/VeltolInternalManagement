"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { formatCurrency, formatConvertedCurrency } from "@/shared/utils/currency";
import { AddBudgetLineDialog } from "./AddBudgetLineDialog";
import { EditBudgetLineDialog } from "./EditBudgetLineDialog";
import { deleteBudgetLineAction } from "@/app/[locale]/(app)/projects/[id]/financiar-actions";
import { useBudgetLinesStore } from "../hooks/useBudgetLinesStore";
import { groupBudgetLinesByCategory, totalBudgetEur } from "../services/marginService";
import type { CostCategory, ProjectBudgetLine } from "../types";

interface Props {
  projectId: number;
  categories: CostCategory[];
  lines: ProjectBudgetLine[];
  exchangeRate: number | null;
  canMutate: boolean;
}

export function DevizTable({ projectId, categories, lines, exchangeRate, canMutate }: Props) {
  const t = useTranslations("financiar");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);

  const {
    isAddDialogOpen, editingLine, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useBudgetLinesStore();

  const grouped = groupBudgetLinesByCategory(categories, lines);
  const totalEur = totalBudgetEur(lines);

  async function handleDelete(lineId: number) {
    const ok = await confirm({ title: t("confirmDeleteLine"), confirmLabel: t("deleteLine") });
    if (!ok) return;
    setDeleteError(null);
    setDeletingId(lineId);
    startTransition(async () => {
      const result = await deleteBudgetLineAction(lineId, projectId);
      setDeletingId(null);
      if (result?.error) {
        setDeleteError({ id: lineId, message: t(result.error as Parameters<typeof t>[0]) });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-veltol-fg">{t("devizTitle")}</div>
          <div className="mt-0.5 font-mono text-[11px] text-veltol-fgMute">
            {t("devizTotal", { amount: formatCurrency(totalEur, "EUR") })}
          </div>
        </div>
        {canMutate && (
          <Button onClick={openAddDialog} variant="outline">
            <Plus data-icon="inline-start" />
            {t("addBudgetLine")}
          </Button>
        )}
      </div>

      {grouped.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-veltol-fgMute">{t("devizEmptyState")}</p>
      ) : (
        <div className="divide-y divide-border">
          {grouped.map(({ category, lines: categoryLines, totalEur: categoryTotalEur }) => (
            <div key={category.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-veltol-fg">{t(`category.${category.code}`)}</div>
                <div className="font-mono text-[12px] text-veltol-fgDim">{formatCurrency(categoryTotalEur, "EUR")}</div>
              </div>

              <div className="mt-2.5 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      {[t("columns.description"), t("columns.qty"), t("columns.unit"), t("columns.unitPrice"), t("columns.amount"), ""].map((col, i) => (
                        <th key={i} className="px-2 py-2 text-left text-[10px] font-medium text-veltol-fgMute">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categoryLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-2 py-2 align-top text-veltol-fg">{line.description}</td>
                        <td className="px-2 py-2 align-top font-mono text-veltol-fgDim">{line.qty}</td>
                        <td className="px-2 py-2 align-top text-veltol-fgDim">{line.unit}</td>
                        <td className="px-2 py-2 align-top font-mono text-veltol-fgDim">
                          {formatCurrency(line.unit_price, line.currency === "EUR" ? "EUR" : "lei")}
                        </td>
                        <td className="px-2 py-2 align-top font-mono text-veltol-fgDim">
                          {formatCurrency(line.amount, line.currency === "EUR" ? "EUR" : "lei")}
                          {" "}
                          {formatConvertedCurrency(line.amount, line.currency, line.conversion_rate)}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {canMutate && (
                            <div className="flex items-center gap-1">
                              <Button size="icon-sm" variant="outline" title={t("editLine")} onClick={() => openEditDialog(line)}>
                                <Pencil />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="destructive"
                                title={t("deleteLine")}
                                disabled={isPending && deletingId === line.id}
                                onClick={() => handleDelete(line.id)}
                              >
                                {isPending && deletingId === line.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                              </Button>
                            </div>
                          )}
                          {deleteError?.id === line.id && (
                            <p className="mt-1 max-w-[8rem] text-[10px] text-veltol-red">{deleteError.message}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddBudgetLineDialog
        projectId={projectId}
        categories={categories}
        exchangeRate={exchangeRate}
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingLine && (
        <EditBudgetLineDialog
          line={editingLine}
          categories={categories}
          open={!!editingLine}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
