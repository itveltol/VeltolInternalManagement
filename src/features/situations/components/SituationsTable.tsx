"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CheckCheck, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { FilterField, FilterInput } from "@/shared/components/ui/filter-field";
import { Pagination } from "@/shared/components/ui/pagination";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle,
  DataCardBadgeSlot, DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { formatDate } from "@/shared/utils/formatDate";
import { formatCurrency, grossOf } from "@/shared/utils/currency";
import { deleteSituationAction } from "@/app/[locale]/(app)/situations/actions";
import { computeSituationFigures, findPreviousFinalized } from "../services/situationService";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { useSituationsStore } from "../hooks/useSituationsStore";
import { CreateSituationDialog } from "./CreateSituationDialog";
import { RenameSituationDialog } from "./RenameSituationDialog";
import { FinalizeSituationDialog } from "./FinalizeSituationDialog";
import { MarkPaidDialog } from "./MarkPaidDialog";
import type { Situation, SituationWithProject } from "../types";
import type { Project } from "@/features/projects/types";

const PAGE_SIZE = 20;

interface Props {
  situations: SituationWithProject[];
  projects: Project[];
  canMutate: boolean;
  canMutateBilling: boolean;
  /** Scopes the table to one contract — level 2 of the centralizer
   * drill-down. When set, the project-name search is hidden (redundant when
   * already scoped to one project), new situations are created pre-bound to
   * this project, and a back button returns to the centralizer. */
  projectFilter?: Project | null;
  onBack?: () => void;
}

export function SituationsTable({ situations, projects, canMutate, canMutateBilling, projectFilter = null, onBack }: Props) {
  const t = useTranslations("situations");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [finalizingSituation, setFinalizingSituation] = useState<SituationWithProject | null>(null);
  const [markingPaidSituation, setMarkingPaidSituation] = useState<SituationWithProject | null>(null);

  const {
    isAddDialogOpen, editingSituation, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId, openSituation,
  } = useSituationsStore();

  const scoped = projectFilter ? situations.filter((s) => s.project_id === projectFilter.id) : situations;

  const contractSourceValue = projectFilter
    ? (projectFilter.currency === "EUR" ? projectFilter.value_eur : projectFilter.value_lei)
    : null;
  const executedNet = projectFilter && contractSourceValue != null
    ? (projectFilter.progress_pct / 100) * contractSourceValue
    : null;
  const executedGross = executedNet != null && projectFilter ? grossOf(executedNet, projectFilter.vat_rate) : null;
  const executedUnit = projectFilter?.currency === "EUR" ? "EUR" : "lei";
  const filtered = projectFilter
    ? scoped
    : scoped.filter((s) => s.project.name.toLowerCase().includes(search.trim().toLowerCase()));

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedSituations = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

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
      {projectFilter && onBack && (
        <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft data-icon="inline-start" />
          {t("centralizer.title")}
        </Button>
      )}
      <TableShell>
        <TableToolbar>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-veltol-fgMute">
              {projectFilter ? (projectFilter.contract_number ?? projectFilter.name) : t("totalCount", { count: scoped.length })}
            </span>
            {projectFilter && executedGross != null && (
              <span className="text-xs text-veltol-fgMute">
                {t("executed.label")}{" "}
                <span className="font-medium text-veltol-fg">{formatCurrency(executedGross, executedUnit)}</span>
                {" "}
                <span>{formatCurrency(executedNet, executedUnit)} {t("executed.netSuffix")}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!projectFilter && (
              <FilterField label={t("searchPlaceholder")} htmlFor="situations-search">
                <FilterInput
                  id="situations-search"
                  type="search"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-48"
                />
              </FilterField>
            )}
            {canMutate && (
              <Button onClick={openAddDialog} variant="outline">
                <Plus data-icon="inline-start" />
                {t("addSituation")}
              </Button>
            )}
          </div>
        </TableToolbar>

        <TableDesktopView>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[t("columns.project"), t("fields.name"), "", t("columns.date"), t("columns.pct"), t("columns.amountEur"), t("columns.amountEurVat"), t("columns.amountLei"), t("columns.amountLeiVat"), ""].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scoped.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("noResults")}
                  </td>
                </tr>
              ) : (
                pagedSituations.map((situation) => {
                  const isFinal = situation.status === "final" || situation.status === "paid";
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
                        {formatCurrency(figures.amountEur != null ? grossOf(figures.amountEur, situation.project.vat_rate) : null, "EUR")}
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim">
                        {formatCurrency(figures.amountLei, "lei")}
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim">
                        {formatCurrency(figures.amountLei != null ? grossOf(figures.amountLei, situation.project.vat_rate) : null, "lei")}
                      </td>
                      <td className="px-5 py-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-1">
                          {canMutate && situation.status === "draft" && (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              title={t("finalize")}
                              onClick={() => setFinalizingSituation(situation)}
                            >
                              <CheckCheck />
                            </Button>
                          )}
                          {canMutateBilling && situation.status === "final" && (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              title={t("markPaid")}
                              onClick={() => setMarkingPaidSituation(situation)}
                            >
                              <Banknote />
                            </Button>
                          )}
                          {canMutate && (
                            <>
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
                            </>
                          )}
                          {deleteError?.id === situation.id && (
                            <p className="max-w-[10rem] text-center text-[10px] text-veltol-red">{deleteError.message}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {situations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("noResults")}</p>
        ) : (
          <DataCardList>
            {pagedSituations.map((situation) => {
              const isFinal = situation.status === "final" || situation.status === "paid";
              const siblings = situations.filter((s) => s.project_id === situation.project_id);
              const previous = findPreviousFinalized(siblings, situation.id);
              const figures = computeSituationFigures(situation, situation.project, previous?.pct_snapshot ?? 0);
              return (
                <DataCard key={situation.id} onClick={() => openSituation(situation.id)}>
                  <DataCardHeader>
                    <div className="min-w-0">
                      <DataCardTitle>{situation.project.name}</DataCardTitle>
                      <p className="mt-0.5 truncate text-[12px] text-veltol-fgDim">{situation.name}</p>
                    </div>
                    <DataCardBadgeSlot>
                      <Badge variant={isFinal ? "success" : "secondary"}>{t(`status.${situation.status}`)}</Badge>
                    </DataCardBadgeSlot>
                  </DataCardHeader>

                  <DataCardBody>
                    <DataCardField label={t("columns.date")}>{formatDate(situation.created_at)}</DataCardField>
                    <DataCardField label={t("columns.pct")}>
                      {figures.pct != null ? `${Math.round(figures.pct)}%` : "—"}
                    </DataCardField>
                    <DataCardField label={t("columns.amountEur")}>{formatCurrency(figures.amountEur, "EUR")}</DataCardField>
                    <DataCardField label={t("columns.amountEurVat")}>
                      {formatCurrency(figures.amountEur != null ? grossOf(figures.amountEur, situation.project.vat_rate) : null, "EUR")}
                    </DataCardField>
                    <DataCardField label={t("columns.amountLei")}>{formatCurrency(figures.amountLei, "lei")}</DataCardField>
                    <DataCardField label={t("columns.amountLeiVat")}>
                      {formatCurrency(figures.amountLei != null ? grossOf(figures.amountLei, situation.project.vat_rate) : null, "lei")}
                    </DataCardField>
                  </DataCardBody>

                  {(canMutate || (canMutateBilling && situation.status === "final")) && (
                    <DataCardFooter className="flex-col items-stretch gap-2">
                      {canMutate && situation.status === "draft" && (
                        <Button
                          variant="outline"
                          onClick={() => setFinalizingSituation(situation)}
                        >
                          <CheckCheck data-icon="inline-start" /> {t("finalize")}
                        </Button>
                      )}
                      {canMutateBilling && situation.status === "final" && (
                        <Button
                          variant="outline"
                          onClick={() => setMarkingPaidSituation(situation)}
                        >
                          <Banknote data-icon="inline-start" /> {t("markPaid")}
                        </Button>
                      )}
                      {canMutate && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => openEditDialog(editableSituation(situation))}
                          >
                            <Pencil data-icon="inline-start" /> {t("editSituation")}
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            disabled={isPending && deletingId === situation.id}
                            onClick={() => handleDelete(situation.id)}
                          >
                            {isPending && deletingId === situation.id ? <Loader2 className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                            {t("deleteSituation")}
                          </Button>
                        </div>
                      )}
                      {deleteError?.id === situation.id && (
                        <p className="text-center text-[11px] text-veltol-red">{deleteError.message}</p>
                      )}
                    </DataCardFooter>
                  )}
                </DataCard>
              );
            })}
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

      <CreateSituationDialog
        projects={projects}
        defaultProject={projectFilter}
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

      {finalizingSituation && (
        <FinalizeSituationDialog
          situationId={finalizingSituation.id}
          projectId={finalizingSituation.project_id}
          open={!!finalizingSituation}
          onClose={() => setFinalizingSituation(null)}
          onFinalized={() => {
            setFinalizingSituation(null);
            router.refresh();
          }}
        />
      )}

      {markingPaidSituation && (
        <MarkPaidDialog
          situationId={markingPaidSituation.id}
          projectId={markingPaidSituation.project_id}
          open={!!markingPaidSituation}
          onClose={() => setMarkingPaidSituation(null)}
          onPaid={() => {
            setMarkingPaidSituation(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
