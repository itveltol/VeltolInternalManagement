"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Pencil, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { parseContractNumber } from "@/shared/utils/contractNumber";
import { useSituationsStore } from "../hooks/useSituationsStore";
import { CreateSituationWithProjectDialog } from "./CreateSituationWithProjectDialog";
import type { CentralizerRow } from "../types";
import type { ProjectManager } from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";

type SortDir = "asc" | "desc" | null;

const PAGE_SIZE = 20;

interface Props {
  rows: CentralizerRow[];
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  nextContractNumber: string;
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

export function ContractCentralizerTable({ rows, managers, clientRefs, nextContractNumber, canMutate, canMutateBilling }: Props) {
  const t = useTranslations("situations.centralizer");
  const router = useRouter();
  const {
    openProject,
    openBillingDialog,
    openAddWithProjectDialog,
    isAddWithProjectDialogOpen,
    closeAddWithProjectDialog,
  } = useSituationsStore();
  const [search, setSearch] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [minContractNumber, setMinContractNumber] = useState("");
  const [maxContractNumber, setMaxContractNumber] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minContractNumber.trim() === "" ? null : Number(minContractNumber);
    const max = maxContractNumber.trim() === "" ? null : Number(maxContractNumber);
    const result = rows.filter((row) => {
      if (!includeCancelled && row.currentPhase === "cancelled") return false;
      if (query) {
        const matchesQuery =
          (row.contractNumber ?? "").toLowerCase().includes(query) ||
          (row.beneficiar ?? "").toLowerCase().includes(query) ||
          row.projectName.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }
      const num = parseContractNumber(row.contractNumber);
      if (min !== null && (num === null || num < min)) return false;
      if (max !== null && (num === null || num > max)) return false;
      return true;
    });

    if (sortDir) {
      result.sort((a, b) => {
        const an = parseContractNumber(a.contractNumber);
        const bn = parseContractNumber(b.contractNumber);
        if (an === null && bn === null) return 0;
        if (an === null) return 1;
        if (bn === null) return -1;
        return sortDir === "asc" ? an - bn : bn - an;
      });
    }

    return result;
  }, [rows, search, includeCancelled, minContractNumber, maxContractNumber, sortDir]);

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

  function handleMinContractNumberChange(value: string) {
    setMinContractNumber(value);
    setPage(1);
  }

  function handleMaxContractNumberChange(value: string) {
    setMaxContractNumber(value);
    setPage(1);
  }

  function cycleSortDir() {
    setSortDir((d) => (d === null ? "desc" : d === "desc" ? "asc" : null));
  }

  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowUpDown;

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

            <FilterField label={t("filters.minContractNumber")} htmlFor="centralizer-min-contract-number">
              <FilterInput
                id="centralizer-min-contract-number"
                type="number"
                value={minContractNumber}
                onChange={(e) => handleMinContractNumberChange(e.target.value)}
                placeholder={t("filterMinContractNumber")}
              />
            </FilterField>

            <FilterField label={t("filters.maxContractNumber")} htmlFor="centralizer-max-contract-number">
              <FilterInput
                id="centralizer-max-contract-number"
                type="number"
                value={maxContractNumber}
                onChange={(e) => handleMaxContractNumberChange(e.target.value)}
                placeholder={t("filterMaxContractNumber")}
              />
            </FilterField>

            <Button
              type="button"
              variant="outline"
              size="sm"
              title={t("sortByContractNumber")}
              onClick={cycleSortDir}
              className="gap-1.5"
            >
              <SortIcon className="size-3.5" />
              {t("sortByContractNumber")}
            </Button>

            <Button
              type="button"
              variant={includeCancelled ? "default" : "outline"}
              size="sm"
              onClick={() => setIncludeCancelled((v) => !v)}
            >
              {t("includeCancelled")}
            </Button>

            {canMutate && (
              <Button onClick={openAddWithProjectDialog} variant="outline">
                <Plus data-icon="inline-start" />
                {t("addSituationWithProject")}
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
                          title={t("editContract")}
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
                      <Pencil data-icon="inline-start" /> {t("editContract")}
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

      <CreateSituationWithProjectDialog
        open={isAddWithProjectDialogOpen}
        managers={managers}
        clientRefs={clientRefs}
        nextContractNumber={nextContractNumber}
        onClose={() => {
          closeAddWithProjectDialog();
          router.refresh();
        }}
      />
    </>
  );
}
