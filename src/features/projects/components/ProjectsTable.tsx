"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AddProjectDialog } from "./AddProjectDialog";
import { EditProjectDialog } from "./EditProjectDialog";
import { deleteProject } from "@/app/[locale]/(app)/projects/actions";
import { useProjectsStore } from "../hooks/useProjectsStore";
import { projectStatusVariant, priorityVariant, phaseVariant } from "@/shared/utils/status-variant";
import type { Project, ProjectManager } from "../types";

interface Props {
  projects: Project[];
  canMutate: boolean;
  managers: ProjectManager[];
}

export function ProjectsTable({ projects, canMutate, managers }: Props) {
  const t = useTranslations("projects");
  const tPhase = useTranslations("projectPhase");
  const tStatus = useTranslations("projectStatus");
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

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(
      locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
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
      <div className="v-panel v-hairline overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <span className="mono-label text-[10px] text-veltol-fgMute">
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
              <tr className="border-b border-white/[0.04]">
                {[
                  t("columns.id"), t("columns.project"), t("columns.county"),
                  t("columns.phase"), t("columns.progress"), t("columns.generalStatus"),
                  t("columns.priority"), t("columns.deadline"), t("columns.value"),
                  t("columns.manager"), "",
                ].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left font-mono text-[9px] uppercase tracking-[0.16em] text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="group transition-colors hover:bg-veltol-surface/30">
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
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-veltol-teal to-veltol-aqua transition-all"
                            style={{ width: `${project.progress_pct}%` }}
                          />
                        </div>
                        <span className="font-mono tabular-nums text-[11px] text-veltol-fgMute">{project.progress_pct}%</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={projectStatusVariant(project.status)}>{tStatus(project.status)}</Badge>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={priorityVariant(project.priority)}>{tPriority(project.priority)}</Badge>
                    </td>

                    <td className="px-5 py-3.5 font-mono tabular-nums text-[12px] text-veltol-fgDim">{formatDate(project.deadline)}</td>

                    <td className="px-5 py-3.5 font-mono tabular-nums text-veltol-fg">
                      {project.value_eur != null ? project.value_eur.toLocaleString("hu-HU") : "—"}
                      {project.value_eur != null && <span className="ml-1 text-[11px] text-veltol-fgMute">€</span>}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">{managerName(project)}</td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/projects/${project.id}`} />}>
                          {t("viewChecklist")}
                        </Button>
                        {canMutate && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(project)}>
                              {t("editProject")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isPending && deletingId === project.id}
                              onClick={() => handleDelete(project.id)}
                            >
                              {isPending && deletingId === project.id ? "..." : t("deleteProject")}
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
      </div>

      <AddProjectDialog
        open={isAddDialogOpen}
        managers={managers}
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
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
