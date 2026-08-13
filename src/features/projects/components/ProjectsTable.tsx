"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterDropdown, FilterMultiDropdown, FilterInput } from "@/shared/components/ui/filter-field";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardSubtitle,
  DataCardBadgeSlot, DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { AddProjectDialog } from "./AddProjectDialog";
import { deleteProject } from "@/app/[locale]/(app)/projects/actions";
import { toast } from "sonner";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { useProjectsStore } from "../hooks/useProjectsStore";
import { phaseVariant } from "@/shared/utils/status-variant";
import { formatDate } from "@/shared/utils/formatDate";
import { PROJECT_PHASES, PROJECT_CATEGORIES, CONTRACT_TYPES } from "../types";
import type { Project, ProjectManager, ProjectType, ProjectPhase, ProjectCategory, ContractType } from "../types";
import type { SortDir } from "./ProjectsShell";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef } from "@/features/subcontractors/types";
import { formatConvertedCurrency } from "@/shared/utils/currency";

const DISCIPLINE_COLORS: Record<ContractType, string> = {
  proiectare: "var(--v-blue)",
  executie: "var(--v-success)",
  mentenanta: "var(--v-warning)",
  racordare: "var(--v-cat-it)",
};

const PAGE_SIZE = 20;

interface Props {
  projects: Project[];
  totalCount: number;
  page: number;
  onPageChange: (page: number) => void;
  onRefetch: () => void;
  isFetching: boolean;
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  exchangeRate: number | null;
  filterPhase: ProjectPhase[];
  onFilterPhase: (v: ProjectPhase[]) => void;
  filterCategory: ProjectCategory | "";
  onFilterCategory: (v: ProjectCategory | "") => void;
  filterContractType: ContractType[];
  onFilterContractType: (v: ContractType[]) => void;
  minValue: string;
  onMinValue: (v: string) => void;
  maxValue: string;
  onMaxValue: (v: string) => void;
  sortDir: SortDir;
  onSortDir: (v: SortDir) => void;
}

export function ProjectsTable({
  projects,
  totalCount,
  page,
  onPageChange,
  onRefetch,
  isFetching,
  canMutate,
  managers,
  clientRefs,
  subcontractorRefs,
  exchangeRate,
  filterPhase,
  onFilterPhase,
  filterCategory,
  onFilterCategory,
  filterContractType,
  onFilterContractType,
  minValue,
  onMinValue,
  maxValue,
  onMaxValue,
  sortDir,
  onSortDir,
}: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tType = useTranslations("projectType");
  const tCategory = useTranslations("projectCategory");
  const tContractType = useTranslations("contractType");
  const locale = useLocale();
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, deletingId,
    openAddDialog, closeAddDialog,
    setDeletingId,
  } = useProjectsStore();

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function cycleSortDir() {
    onSortDir(sortDir === null ? "desc" : sortDir === "desc" ? "asc" : null);
  }

  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowUpDown;

  function daysLeft(iso: string | null): number | null {
    if (!iso) return null;
    const diff = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diff / 86_400_000);
  }

  function abbreviatedName(first: string | null | undefined, last: string | null | undefined) {
    const firstInitial = first ? `${first[0]}.` : "";
    const lastInitial = last ? `${last[0]}.` : "";
    return [firstInitial, lastInitial].filter(Boolean).join("");
  }

  function managerName(project: Project) {
    const m = project.manager;
    if (!m) return "—";
    return abbreviatedName(m.first_name, m.last_name) || "—";
  }

  function updatedByName(project: Project) {
    const u = project.updated_by_user;
    if (!u) return "—";
    return abbreviatedName(u.first_name, u.last_name) || "—";
  }

  function projectFigures(project: Project) {
    const deadline = project.execution_mode === "subcontracted"
      ? project.subcontractor?.deadline ?? null
      : project.deadline;
    const valueEur = project.execution_mode === "subcontracted"
      ? project.subcontractor?.price_eur ?? null
      : project.value_eur;
    const valueLei = project.execution_mode === "subcontracted"
      ? project.subcontractor?.price_lei ?? null
      : project.value_lei;
    const currency = project.execution_mode === "subcontracted"
      ? project.subcontractor?.currency ?? "EUR"
      : project.currency;
    const sourceValue = currency === "EUR" ? valueEur : valueLei;
    const conversionRate = project.execution_mode === "subcontracted"
      ? project.subcontractor?.conversion_rate ?? null
      : project.conversion_rate;
    return { deadline, sourceValue, currency, conversionRate };
  }

  async function handleDelete(projectId: number) {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("deleteProject") });
    if (!ok) return;
    setDeletingId(projectId);
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (result?.error) toast.error(t(result.error as "errorNotAllowed" | "errorGeneric"));
      else if (result?.success) toast.success(t(result.success as "projectDeleted"));
      setDeletingId(null);
      onRefetch();
    });
  }

  return (
    <>
      <TableShell>
        <TableToolbar>
          <div>
            <span className="text-[14px] font-medium text-veltol-fgDim">
              {t("totalCount", { count: totalCount })}
            </span>
          </div>
          {canMutate && (
            <Button onClick={openAddDialog} size="lg">
              <Plus data-icon="inline-start" />
              {t("addProject")}
            </Button>
          )}
        </TableToolbar>

        <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
          <FilterField label={t("filters.phase")} htmlFor="filter-phase">
            <FilterMultiDropdown
              id="filter-phase"
              value={filterPhase}
              onChange={(v) => onFilterPhase(v as ProjectPhase[])}
              allLabel={t("filterAllPhases")}
              options={PROJECT_PHASES.map((p) => ({ value: p, label: tPhase(p) }))}
            />
          </FilterField>

          <FilterField label={t("filters.category")} htmlFor="filter-category">
            <FilterDropdown
              id="filter-category"
              value={filterCategory}
              onChange={(v) => onFilterCategory(v as ProjectCategory | "")}
              allLabel={t("filterAllCategories")}
              options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: tCategory(c) }))}
            />
          </FilterField>

          <FilterField label={t("filters.contractType")} htmlFor="filter-contract-type">
            <FilterMultiDropdown
              id="filter-contract-type"
              value={filterContractType}
              onChange={(v) => onFilterContractType(v as ContractType[])}
              allLabel={t("filterAllContractTypes")}
              options={CONTRACT_TYPES.map((c) => ({ value: c, label: tContractType(c) }))}
            />
          </FilterField>

          <FilterField label={t("filters.minValue")} htmlFor="filter-min-value">
            <FilterInput
              id="filter-min-value"
              type="number"
              value={minValue}
              onChange={(e) => onMinValue(e.target.value)}
              placeholder={t("filterMinValue")}
            />
          </FilterField>

          <FilterField label={t("filters.maxValue")} htmlFor="filter-max-value">
            <FilterInput
              id="filter-max-value"
              type="number"
              value={maxValue}
              onChange={(e) => onMaxValue(e.target.value)}
              placeholder={t("filterMaxValue")}
            />
          </FilterField>

          <Button
            variant="outline"
            size="sm"
            title={t("sortByValue")}
            onClick={cycleSortDir}
            className="gap-1.5"
          >
            <SortIcon className="size-3.5" />
            {t("sortByValue")}
          </Button>
        </div>

        <TableDesktopView>
          <table className={`w-full min-w-max text-[14px] transition-opacity ${isFetching ? "opacity-60" : ""}`}>
            <thead>
              <tr className="border-b border-border">
                {[
                  t("columns.id"), t("columns.project"), t("columns.county"),
                  t("columns.contractType"),
                  t("columns.phase"), t("columns.progress"),
                  t("columns.deadline"), t("columns.value"),
                  t("columns.manager"), t("columns.client"), t("columns.lastModified"), "",
                ].map((col, i) => (
                  <th
                    key={i}
                    className={
                      i === 3 || i === 9
                        ? "max-w-[90px] px-3 py-3 text-left text-[11.5px] font-bold uppercase tracking-[.09em] whitespace-normal text-veltol-fgMute"
                        : "px-3 py-3 text-left text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute"
                    }
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="group cursor-pointer transition-colors hover:bg-veltol-hover"
                    onClick={() => router.push(`/${locale}/projects/${project.id}`)}
                  >
                    <td className="px-3 py-3 tabular-nums whitespace-nowrap text-[12px] text-veltol-fgMute">{project.id}</td>

                    <td className="min-w-[220px] px-3 py-3">
                      <div className="truncate font-semibold text-veltol-fg">{project.name}</div>
                      <div className="mt-0.5 truncate text-[12px] text-veltol-fgDim">
                        {project.project_category && tCategory(project.project_category)}
                        {project.project_category !== "residential" && project.project_type && (
                          <> · {tType(project.project_type as ProjectType).replace("+", " + ")}</>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3 font-medium text-veltol-fgDim">{project.county ?? "—"}</td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {project.contract_type.map((c) => (
                          <div
                            key={c}
                            title={tContractType(c)}
                            className="flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ backgroundColor: DISCIPLINE_COLORS[c] }}
                          >
                            {c.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      {project.execution_mode === "subcontracted" ? (
                        <Badge variant="secondary" dot>{t("subcontracted")}</Badge>
                      ) : (
                        <Badge variant={phaseVariant(project.current_phase)} dot>{tPhase(project.current_phase)}</Badge>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {project.execution_mode === "subcontracted" ? (
                        <span className="whitespace-nowrap text-[12px] font-medium text-veltol-fgDim">
                          {project.subcontractor?.name ?? "—"}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--v-line-2)]">
                            <div
                              className="h-full rounded-full bg-veltol-accent transition-all"
                              style={{ width: `${project.progress_pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums whitespace-nowrap text-[12px] font-medium text-veltol-fgMute">{project.progress_pct}%</span>
                        </div>
                      )}
                    </td>

                    {(() => {
                      const { deadline, sourceValue, currency, conversionRate } = projectFigures(project);
                      return (
                        <>
                          <td className="px-3 py-3">
                            <span className="block tabular-nums whitespace-nowrap text-[12px] font-medium text-veltol-fgDim">{formatDate(deadline) || "—"}</span>
                            {deadline && (() => {
                              const d = daysLeft(deadline);
                              if (d === null) return null;
                              const color = d < 0 ? "text-veltol-red" : d <= 7 ? "text-veltol-orange" : "text-veltol-fgMute";
                              const label = d < 0
                                ? t("daysOverdue", { count: Math.abs(d) })
                                : d === 0
                                  ? t("daysLeftToday")
                                  : t("daysLeft", { count: d });
                              return <span className={`block tabular-nums whitespace-nowrap text-[11px] font-medium ${color}`}>{label}</span>;
                            })()}
                          </td>

                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="font-semibold tabular-nums text-veltol-fg">
                              {sourceValue != null ? new Intl.NumberFormat("hu-HU").format(sourceValue) : "—"}
                              {sourceValue != null && <span className="ml-1 text-[12px] font-medium text-veltol-fgMute">{currency === "EUR" ? "€" : "Lei"}</span>}
                            </div>
                            {sourceValue != null && (
                              <div className="tabular-nums text-[11px] font-medium text-veltol-fgMute">
                                {formatConvertedCurrency(sourceValue, currency, conversionRate)}
                              </div>
                            )}
                          </td>
                        </>
                      );
                    })()}

                    <td className="px-3 py-3 text-[13px] font-medium text-veltol-fgDim">{managerName(project)}</td>

                    <td className="max-w-[110px] px-3 py-3 text-[13px] font-medium text-veltol-fgDim">
                      {project.client?.name ?? "—"}
                    </td>

                    <td className="px-3 py-3">
                      <div className="whitespace-nowrap text-[13px] font-medium text-veltol-fgDim">{updatedByName(project)}</div>
                      <div className="whitespace-nowrap text-[11px] font-medium text-veltol-fgMute">{formatDate(project.updated_at) || "—"}</div>
                    </td>

                    <td className="px-3 py-3">
                      {canMutate && (
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            title={t("deleteProject")}
                            disabled={isPending && deletingId === project.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(project.id);
                            }}
                          >
                            {isPending && deletingId === project.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {projects.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : (
          <DataCardList>
            {projects.map((project) => {
              const { deadline, sourceValue, currency, conversionRate } = projectFigures(project);
              const d = deadline ? daysLeft(deadline) : null;
              const daysColor = d === null ? undefined : d < 0 ? "text-veltol-red" : d <= 7 ? "text-veltol-orange" : "text-veltol-fgMute";
              const daysLabel = d === null ? null : d < 0
                ? t("daysOverdue", { count: Math.abs(d) })
                : d === 0
                  ? t("daysLeftToday")
                  : t("daysLeft", { count: d });
              return (
                <DataCard key={project.id} onClick={() => router.push(`/${locale}/projects/${project.id}`)}>
                  <DataCardHeader>
                    <div className="min-w-0">
                      <DataCardTitle>{project.name}</DataCardTitle>
                      <DataCardSubtitle>
                        {project.project_category && tCategory(project.project_category)}
                        {project.project_category !== "residential" && project.project_type && (
                          <> · {tType(project.project_type as ProjectType).replace("+", " + ")}</>
                        )}
                      </DataCardSubtitle>
                    </div>
                    <DataCardBadgeSlot>
                      {project.execution_mode === "subcontracted" ? (
                        <Badge variant="secondary" dot>{t("subcontracted")}</Badge>
                      ) : (
                        <Badge variant={phaseVariant(project.current_phase)} dot>{tPhase(project.current_phase)}</Badge>
                      )}
                    </DataCardBadgeSlot>
                  </DataCardHeader>

                  <div className="flex flex-wrap gap-1">
                    {project.contract_type.map((c) => (
                      <div
                        key={c}
                        title={tContractType(c)}
                        className="flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: DISCIPLINE_COLORS[c] }}
                      >
                        {c.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>

                  {project.execution_mode !== "subcontracted" && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--v-line-2)]">
                        <div
                          className="h-full rounded-full bg-veltol-accent transition-all"
                          style={{ width: `${project.progress_pct}%` }}
                        />
                      </div>
                      <span className="tabular-nums whitespace-nowrap text-[12px] font-medium text-veltol-fgMute">{project.progress_pct}%</span>
                    </div>
                  )}

                  <DataCardBody>
                    <DataCardField label={t("columns.county")}>{project.county ?? "—"}</DataCardField>
                    {project.execution_mode === "subcontracted" && (
                      <DataCardField label={t("columns.progress")}>{project.subcontractor?.name ?? "—"}</DataCardField>
                    )}
                    <DataCardField label={t("columns.deadline")}>
                      {formatDate(deadline) || "—"}
                      {daysLabel && <span className={`ml-1 ${daysColor}`}>({daysLabel})</span>}
                    </DataCardField>
                    <DataCardField label={t("columns.value")}>
                      {sourceValue != null ? (
                        <>
                          {new Intl.NumberFormat("hu-HU").format(sourceValue)}{" "}
                          {currency === "EUR" ? "€" : "Lei"}
                          <span className="ml-1 text-veltol-fgMute">
                            {formatConvertedCurrency(sourceValue, currency, conversionRate)}
                          </span>
                        </>
                      ) : "—"}
                    </DataCardField>
                    <DataCardField label={t("columns.manager")}>{managerName(project)}</DataCardField>
                    <DataCardField label={t("columns.client")}>{project.client?.name ?? "—"}</DataCardField>
                    <DataCardField label={t("columns.lastModified")} full>
                      {updatedByName(project)} · {formatDate(project.updated_at) || "—"}
                    </DataCardField>
                  </DataCardBody>

                  {canMutate && (
                    <DataCardFooter>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={isPending && deletingId === project.id}
                        onClick={() => handleDelete(project.id)}
                      >
                        {isPending && deletingId === project.id ? <Loader2 className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                        {t("deleteProject")}
                      </Button>
                    </DataCardFooter>
                  )}
                </DataCard>
              );
            })}
          </DataCardList>
        )}

        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={onPageChange}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
          pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
        />
      </TableShell>

      <AddProjectDialog
        open={isAddDialogOpen}
        managers={managers}
        clientRefs={clientRefs}
        subcontractorRefs={subcontractorRefs}
        exchangeRate={exchangeRate}
        onClose={() => {
          closeAddDialog();
          onRefetch();
        }}
      />
    </>
  );
}
