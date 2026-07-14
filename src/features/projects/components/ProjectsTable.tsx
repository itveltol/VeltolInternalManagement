"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Pagination } from "@/shared/components/ui/pagination";
import { Link } from "@/i18n/navigation";
import { AddProjectDialog } from "./AddProjectDialog";
import { EditProjectDialog } from "./EditProjectDialog";
import { deleteProject } from "@/app/[locale]/(app)/projects/actions";
import { useProjectsStore } from "../hooks/useProjectsStore";
import { priorityVariant, phaseVariant } from "@/shared/utils/status-variant";
import type { Project, ProjectManager } from "../types";
import type { ClientRef } from "@/features/clients/types";

const PAGE_SIZE = 20;

interface Props {
  projects: Project[];
  canMutate: boolean;
  managers: ProjectManager[];
  clientRefs: ClientRef[];
}

export function ProjectsTable({ projects, canMutate, managers, clientRefs }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tPriority = useTranslations("projectPriority");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, editingProject, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useProjectsStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  // Clamp during render (not an effect) if the underlying list shrank below the current page.
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedProjects = projects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="text-xs font-medium text-veltol-fgMute">
              {t("totalCount", { count: projects.length })}
            </span>
          </div>
          {canMutate && (
            <Button onClick={openAddDialog} variant="outline">
              {t("addProject")}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  t("columns.id"), t("columns.project"), t("columns.county"),
                  t("columns.phase"), t("columns.progress"),
                  t("columns.priority"), t("columns.deadline"), t("columns.value"),
                  t("columns.manager"), t("columns.client"), "",
                ].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                pagedProjects.map((project) => (
                  <tr key={project.id} className="group transition-colors hover:bg-veltol-surface/50">
                    <td className="px-5 py-3.5 font-mono tabular-nums text-[11px] text-veltol-fgMute">{project.id}</td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-veltol-fg">{project.name}</div>
                      {project.project_type && (
                        <div className="mt-0.5 text-[11px] text-veltol-fgDim">{project.project_type}</div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-veltol-fgDim">{project.county ?? "—"}</td>

                    <td className="px-5 py-3.5">
                      <Badge variant={phaseVariant(project.current_phase)}>{tPhase(project.current_phase)}</Badge>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-veltol-surface">
                          <div
                            className="h-full rounded-full bg-veltol-accent transition-all"
                            style={{ width: `${project.progress_pct}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-veltol-fgMute">{project.progress_pct}%</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={priorityVariant(project.priority)}>{tPriority(project.priority)}</Badge>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-mono tabular-nums text-[12px] text-veltol-fgDim">{formatDate(project.deadline)}</span>
                      {project.deadline && (() => {
                        const d = daysLeft(project.deadline);
                        if (d === null) return null;
                        const color = d < 0 ? "text-veltol-red" : d <= 7 ? "text-veltol-orange" : "text-veltol-fgMute";
                        const label = d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "today" : `${d}d left`;
                        return <span className={`block font-mono tabular-nums text-[11px] ${color}`}>{label}</span>;
                      })()}
                    </td>

                    <td className="px-5 py-3.5 font-mono tabular-nums text-veltol-fg">
                      {project.value_eur != null ? new Intl.NumberFormat("hu-HU").format(project.value_eur) : "—"}
                      {project.value_eur != null && <span className="ml-1 text-[11px] text-veltol-fgMute">€</span>}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">{managerName(project)}</td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">
                      {project.client?.name ?? "—"}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title={t("viewChecklist")}
                          nativeButton={false}
                          render={<Link href={`/projects/${project.id}`} />}
                        >
                          <Eye />
                        </Button>
                        {canMutate && (
                          <>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              title={t("editProject")}
                              onClick={() => openEditDialog(project)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="destructive"
                              title={t("deleteProject")}
                              disabled={isPending && deletingId === project.id}
                              onClick={() => handleDelete(project.id)}
                            >
                              {isPending && deletingId === project.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                            </Button>
                          </>
                        )}
                      </div>
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

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          managers={managers}
          clientRefs={clientRefs}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
