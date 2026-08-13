"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FilterField, FilterInput } from "@/shared/components/ui/filter-field";
import { Pagination } from "@/shared/components/ui/pagination";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardSubtitle,
  DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { formatCurrency } from "@/shared/utils/currency";
import { cn } from "@/shared/utils/cn";
import { useSituationsStore } from "../hooks/useSituationsStore";
import { CreateSituationDialog } from "./CreateSituationDialog";
import type { CentralizerRow } from "../types";
import type { Project } from "@/features/projects/types";

const PAGE_SIZE = 20;

interface Props {
  rows: CentralizerRow[];
  projects: Project[];
  canMutate: boolean;
  canMutateBilling: boolean;
}

function Money({ value }: { value: number }) {
  return (
    <span className={cn(value < 0 && "text-veltol-red")}>
      {formatCurrency(value, "EUR")}
    </span>
  );
}

export function ContractCentralizerTable({ rows, projects, canMutate, canMutateBilling }: Props) {
  const t = useTranslations("situations.centralizer");
  const router = useRouter();
  const { openProject, openBillingDialog, openAddDialog, isAddDialogOpen, closeAddDialog } = useSituationsStore();
  const [search, setSearch] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!includeCancelled && row.currentPhase === "cancelled") return false;
      if (!query) return true;
      return (
        (row.contractNumber ?? "").toLowerCase().includes(query) ||
        (row.beneficiar ?? "").toLowerCase().includes(query) ||
        row.projectName.toLowerCase().includes(query)
      );
    });
  }, [rows, search, includeCancelled]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => ({
        eurContractValue: acc.eurContractValue + row.eur.contractValue.gross,
        eurExecuted: acc.eurExecuted + row.eur.executed.gross,
        eurInvoiced: acc.eurInvoiced + row.eur.invoiced.gross,
        eurCollected: acc.eurCollected + row.eur.collected.gross,
        eurRemainingToExecute: acc.eurRemainingToExecute + row.eur.remainingToExecute,
        eurRemainingToInvoice: acc.eurRemainingToInvoice + row.eur.remainingToInvoice,
      }),
      {
        eurContractValue: 0, eurExecuted: 0, eurInvoiced: 0, eurCollected: 0,
        eurRemainingToExecute: 0, eurRemainingToInvoice: 0,
      },
    );
  }, [filtered]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const columns = [
    t("columns.contractNumber"),
    t("columns.beneficiar"),
    t("columns.contractValueEur"),
    t("columns.executedEur"),
    t("columns.invoicedEur"),
    t("columns.collectedEur"),
    t("columns.remainingToExecuteEur"),
    t("columns.remainingToInvoiceEur"),
    "",
  ];

  return (
    <>
      <TableShell>
        <TableToolbar>
          <span className="text-xs font-medium text-veltol-fgMute">
            {t("totalCount", { count: filtered.length })}
          </span>
          <div className="flex flex-wrap items-end gap-3">
            <FilterField label={t("searchPlaceholder")} htmlFor="centralizer-search">
              <FilterInput
                id="centralizer-search"
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-56"
              />
            </FilterField>

            <Button
              type="button"
              variant={includeCancelled ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeCancelled((v) => !v)}
            >
              {t("includeCancelled")}
            </Button>

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
                {columns.map((col, i) => (
                  <th key={i} className="min-w-[7rem] px-4 py-3 text-left text-[11px] font-medium leading-snug text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("noResults")}
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => (
                  <tr
                    key={row.projectId}
                    className="group cursor-pointer transition-colors hover:bg-veltol-surface/50"
                    onClick={() => openProject(row.projectId)}
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 align-top font-medium text-veltol-fg">
                      {row.contractNumber ?? "—"}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3.5 align-top text-veltol-fgDim">
                      {row.beneficiar ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim"><Money value={row.eur.contractValue.gross} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim"><Money value={row.eur.executed.gross} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim"><Money value={row.eur.invoiced.gross} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[12px] text-veltol-fgDim"><Money value={row.eur.collected.gross} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[12px]"><Money value={row.eur.remainingToExecute} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[12px]"><Money value={row.eur.remainingToInvoice} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 align-top" onClick={(e) => e.stopPropagation()}>
                      {canMutateBilling && (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          title={t("editBilling")}
                          onClick={() => openBillingDialog(row.projectId)}
                        >
                          <Pencil />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border font-semibold text-veltol-fg">
                  <td className="whitespace-nowrap px-4 py-3.5" colSpan={2}>{t("totalsRow")}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px]"><Money value={totals.eurContractValue} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px]"><Money value={totals.eurExecuted} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px]"><Money value={totals.eurInvoiced} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px]"><Money value={totals.eurCollected} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px]"><Money value={totals.eurRemainingToExecute} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px]"><Money value={totals.eurRemainingToInvoice} /></td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </TableDesktopView>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("noResults")}</p>
        ) : (
          <DataCardList>
            {pagedRows.map((row) => (
              <DataCard key={row.projectId} onClick={() => openProject(row.projectId)}>
                <DataCardHeader>
                  <div className="min-w-0">
                    <DataCardTitle>{row.contractNumber ?? row.projectName}</DataCardTitle>
                    <DataCardSubtitle>{row.beneficiar ?? "—"}</DataCardSubtitle>
                  </div>
                </DataCardHeader>

                <DataCardBody>
                  <DataCardField label={t("columns.contractValueEur")}><Money value={row.eur.contractValue.gross} /></DataCardField>
                  <DataCardField label={t("columns.executedEur")}><Money value={row.eur.executed.gross} /></DataCardField>
                  <DataCardField label={t("columns.invoicedEur")}><Money value={row.eur.invoiced.gross} /></DataCardField>
                  <DataCardField label={t("columns.collectedEur")}><Money value={row.eur.collected.gross} /></DataCardField>
                  <DataCardField label={t("columns.remainingToExecuteEur")}><Money value={row.eur.remainingToExecute} /></DataCardField>
                  <DataCardField label={t("columns.remainingToInvoiceEur")} full><Money value={row.eur.remainingToInvoice} /></DataCardField>
                </DataCardBody>

                {canMutateBilling && (
                  <DataCardFooter>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openBillingDialog(row.projectId)}
                    >
                      <Pencil data-icon="inline-start" /> {t("editBilling")}
                    </Button>
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

      <CreateSituationDialog
        projects={projects}
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />
    </>
  );
}
