"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { AddProjectDialog } from "./AddProjectDialog";
import { deleteProject } from "@/app/[locale]/(app)/projects/actions";
import { useProjectsStore } from "../hooks/useProjectsStore";
import { priorityVariant, phaseVariant } from "@/shared/utils/status-variant";
import { PROJECT_PHASES, PROJECT_CATEGORIES, CONTRACT_TYPES } from "../types";
import type { Project, ProjectManager, ProjectType, ProjectPhase, ProjectCategory, ContractType } from "../types";
import type { SortDir } from "./ProjectsShell";
import type { ClientRef } from "@/features/clients/types";

const PAGE_SIZE = 20;

const SELECT_CLASS =
  "h-8 rounded-btn border border-border bg-card px-2.5 py-1 text-[13px] font-medium text-veltol-fg outline-none focus:border-veltol-accent focus:ring-2 focus:ring-veltol-accent/20 appearance-none";

const INPUT_CLASS =
  "h-8 w-24 rounded-btn border border-border bg-card px-2.5 py-1 text-[13px] font-medium text-veltol-fg outline-none placeholder:text-veltol-faint focus:border-veltol-accent focus:ring-2 focus:ring-veltol-accent/20";

const DISCIPLINE_COLORS: Record<ContractType, string> = {
  proiectare: "var(--v-blue)",
  executie: "var(--v-success)",
  mentenanta: "var(--v-warning)",
};

interface Props {
  projects: Project[];
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  filterPhase: ProjectPhase | "";
  onFilterPhase: (v: ProjectPhase | "") => void;
  filterCategory: ProjectCategory | "";
  onFilterCategory: (v: ProjectCategory | "") => void;
  filterContractType: ContractType | "";
  onFilterContractType: (v: ContractType | "") => void;
  minValue: string;
  onMinValue: (v: string) => void;
  maxValue: string;
  onMaxValue: (v: string) => void;
  sortDir: SortDir;
  onSortDir: (v: SortDir) => void;
}

export function ProjectsTable({
  projects,
  canMutate,
  managers,
  clientRefs,
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
  const tPriority = useTranslations("projectPriority");
  const tType = useTranslations("projectType");
  const tCategory = useTranslations("projectCategory");
  const tContractType = useTranslations("contractType");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, deletingId,
    openAddDialog, closeAddDialog,
    setDeletingId,
  } = useProjectsStore();

  const [page, setPage] = useState(1);
  const filterKey = `${filterPhase}:${filterCategory}:${filterContractType}:${minValue}:${maxValue}:${sortDir}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  const pageCount = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  // Reset to page 1 whenever the filter/sort combo changes (derived during
  // render, not an effect), then clamp in case the list itself shrank.
  let currentPage = page;
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    currentPage = 1;
    setPage(1);
  } else if (page !== Math.min(page, pageCount)) {
    currentPage = Math.min(page, pageCount);
    setPage(currentPage);
  }
  const pagedProjects = projects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function cycleSortDir() {
    onSortDir(sortDir === null ? "desc" : sortDir === "desc" ? "asc" : null);
  }

  const SortIcon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowUpDown;

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  }

  function daysLeft(iso: string | null): number | null {
    if (!iso) return null;
    const diff = new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diff / 86_400_000);
  }

  function managerName(project: Project) {
    const m = project.manager;
    if (!m) return "—";
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ");
    return name || "—";
  }

  function handleDelete(projectId: number) {
    if (!confirm(`${t("confirmDelete")}`)) return;
    setDeletingId(projectId);
    startTransition(async () => {
      await deleteProject(projectId);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="text-[14px] font-medium text-veltol-fgDim">
              {t("totalCount", { count: projects.length })}
            </span>
          </div>
          {canMutate && (
            <Button onClick={openAddDialog} size="lg">
              <Plus data-icon="inline-start" />
              {t("addProject")}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
          <select
            value={filterPhase}
            onChange={(e) => onFilterPhase(e.target.value as ProjectPhase | "")}
            className={SELECT_CLASS}
          >
            <option value="">{t("filterAllPhases")}</option>
            {PROJECT_PHASES.map((p) => (
              <option key={p} value={p}>{tPhase(p)}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => onFilterCategory(e.target.value as ProjectCategory | "")}
            className={SELECT_CLASS}
          >
            <option value="">{t("filterAllCategories")}</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{tCategory(c)}</option>
            ))}
          </select>

          <select
            value={filterContractType}
            onChange={(e) => onFilterContractType(e.target.value as ContractType | "")}
            className={SELECT_CLASS}
          >
            <option value="">{t("filterAllContractTypes")}</option>
            {CONTRACT_TYPES.map((c) => (
              <option key={c} value={c}>{tContractType(c)}</option>
            ))}
          </select>

          <input
            type="number"
            value={minValue}
            onChange={(e) => onMinValue(e.target.value)}
            placeholder={t("filterMinValue")}
            className={INPUT_CLASS}
          />
          <input
            type="number"
            value={maxValue}
            onChange={(e) => onMaxValue(e.target.value)}
            placeholder={t("filterMaxValue")}
            className={INPUT_CLASS}
          />

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

        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  t("columns.id"), t("columns.project"), t("columns.county"),
                  t("columns.contractType"),
                  t("columns.phase"), t("columns.progress"),
                  `${t("columns.priority")} / ${t("columns.deadline")}`, t("columns.value"),
                  t("columns.manager"), t("columns.client"), "",
                ].map((col, i) => (
                  <th key={i} className="px-3 py-3 text-left text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">
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
                pagedProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="group cursor-pointer transition-colors hover:bg-[#F6F9FE]"
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
                      <Badge variant={phaseVariant(project.current_phase)} dot>{tPhase(project.current_phase)}</Badge>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--v-line-2)]">
                          <div
                            className="h-full rounded-full bg-veltol-accent transition-all"
                            style={{ width: `${project.progress_pct}%` }}
                          />
                        </div>
                        <span className="tabular-nums whitespace-nowrap text-[12px] font-medium text-veltol-fgMute">{project.progress_pct}%</span>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <Badge variant={priorityVariant(project.priority)}>{tPriority(project.priority)}</Badge>
                      <span className="mt-0.5 block tabular-nums whitespace-nowrap text-[12px] font-medium text-veltol-fgDim">{formatDate(project.deadline)}</span>
                      {project.deadline && (() => {
                        const d = daysLeft(project.deadline);
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

                    <td className="px-3 py-3 font-semibold tabular-nums whitespace-nowrap text-veltol-fg">
                      {project.value_eur != null ? new Intl.NumberFormat("hu-HU").format(project.value_eur) : "—"}
                      {project.value_eur != null && <span className="ml-1 text-[12px] font-medium text-veltol-fgMute">€</span>}
                    </td>

                    <td className="px-3 py-3 text-[13px] font-medium text-veltol-fgDim">{managerName(project)}</td>

                    <td className="px-3 py-3 text-[13px] font-medium text-veltol-fgDim">
                      {project.client?.name ?? "—"}
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

      <AddProjectDialog
        open={isAddDialogOpen}
        managers={managers}
        clientRefs={clientRefs}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />
    </>
  );
}
