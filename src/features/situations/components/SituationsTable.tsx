"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { FilterField, FilterInput } from "@/shared/components/ui/filter-field";
import { formatDate } from "@/shared/utils/formatDate";
import { formatCurrency } from "@/shared/utils/currency";
import { deleteSituationAction } from "@/app/[locale]/(app)/situations/actions";
import { computeSituationFigures, findPreviousFinalized } from "../services/situationService";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { useSituationsStore } from "../hooks/useSituationsStore";
import { CreateSituationDialog } from "./CreateSituationDialog";
import { RenameSituationDialog } from "./RenameSituationDialog";
import type { Situation, SituationWithProject } from "../types";
import type { Project } from "@/features/projects/types";

interface Props {
  situations: SituationWithProject[];
  projects: Project[];
  canMutate: boolean;
}

export function SituationsTable({ situations, projects, canMutate }: Props) {
  const t = useTranslations("situations");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);
  const [search, setSearch] = useState("");

  const {
    isAddDialogOpen, editingSituation, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId, openSituation,
  } = useSituationsStore();

  const filtered = situations.filter((s) =>
    s.project.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function handleDelete(situationId: number) {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("deleteSituation") });
    if (!ok) return;
    setDeleteError(null);
    setDeletingId(situationId);
    startTransition(async () => {
      const result = await deleteSituationAction(situationId);
      setDeletingId(null);
      if (result?.error) {
        setDeleteError({ id: situationId, message: t(result.error as Parameters<typeof t>[0]) });
        return;
      }
      router.refresh();
    });
  }

  function editableSituation(s: SituationWithProject): Situation {
    const { project: _project, ...situation } = s;
    return situation;
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <span className="text-xs font-medium text-veltol-fgMute">
            {t("totalCount", { count: situations.length })}
          </span>
          <div className="flex items-center gap-3">
            <FilterField label={t("searchPlaceholder")} htmlFor="situations-search">
              <FilterInput
                id="situations-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-48"
              />
            </FilterField>
            {canMutate && (
              <Button onClick={openAddDialog} variant="outline">
                <Plus data-icon="inline-start" />
                {t("addSituation")}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[t("columns.project"), t("fields.name"), "", t("columns.date"), t("columns.pct"), t("columns.amountEur"), t("columns.amountLei"), ""].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {situations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("noResults")}
                  </td>
                </tr>
              ) : (
                filtered.map((situation) => {
                  const isFinal = situation.status === "final";
                  const siblings = situations.filter((s) => s.project_id === situation.project_id);
                  const previous = findPreviousFinalized(siblings, situation.id);
                  const figures = computeSituationFigures(situation, situation.project, previous?.pct_snapshot ?? 0);
                  return (
                    <tr
                      key={situation.id}
                      className="group cursor-pointer transition-colors hover:bg-veltol-surface/50"
                      onClick={() => openSituation(situation.id)}
                    >
                      <td className="px-5 py-3.5 align-top font-medium text-veltol-fg">
                        {situation.project.name}
                      </td>
                      <td className="px-5 py-3.5 align-top text-veltol-fgDim">
                        {situation.name}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <Badge variant={isFinal ? "success" : "secondary"}>
                          {t(`status.${situation.status}`)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono text-[11px] text-veltol-fgDim">
                        {formatDate(situation.created_at)}
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim">
                        {figures.pct != null ? `${Math.round(figures.pct)}%` : "—"}
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim">
                        {formatCurrency(figures.amountEur, "EUR")}
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim">
                        {formatCurrency(figures.amountLei, "lei")}
                      </td>
                      <td className="px-5 py-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                        {canMutate && (
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              title={t("editSituation")}
                              onClick={() => openEditDialog(editableSituation(situation))}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="destructive"
                              title={t("deleteSituation")}
                              disabled={isPending && deletingId === situation.id}
                              onClick={() => handleDelete(situation.id)}
                            >
                              {isPending && deletingId === situation.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                            </Button>
                            {deleteError?.id === situation.id && (
                              <p className="max-w-[10rem] text-center text-[10px] text-veltol-red">{deleteError.message}</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateSituationDialog
        projects={projects}
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingSituation && (
        <RenameSituationDialog
          situation={editingSituation}
          open={!!editingSituation}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
