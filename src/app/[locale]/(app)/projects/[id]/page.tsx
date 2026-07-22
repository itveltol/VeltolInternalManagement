import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getProject, getChecklistRecords, getProjectDocuments, getTeamsForGantt, getProjectManagers, getClientRefs } from "./actions";
import { mergeChecklistRows, computeSectionSummaries } from "@/features/projects/checklists/services/checklistTemplate";
import { ChecklistShell } from "@/features/projects/checklists/components/ChecklistShell";
import { GanttShell } from "@/features/projects/checklists/components/GanttShell";
import { LinkFolderForm } from "@/features/projects/components/LinkFolderForm";
import { ProjectOverviewPanel } from "@/features/projects/components/ProjectOverviewPanel";
import { ProjectDocumentsTab } from "@/features/documents/components/ProjectDocumentsTab";
import { Badge } from "@/shared/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { phaseVariant, projectStatusVariant } from "@/shared/utils/status-variant";

interface Props {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectChecklistPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  const projectId = Number(id);
  if (isNaN(projectId)) notFound();

  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");

  const isDocumentsTab = tab === "documents";
  const isGanttTab = tab === "gantt";

  const [project, records, projectDocuments, teams, managers, clientRefs] = await Promise.all([
    getProject(projectId),
    getChecklistRecords(projectId),
    isDocumentsTab ? getProjectDocuments(projectId) : Promise.resolve([]),
    canMutate ? getTeamsForGantt() : Promise.resolve([]),
    canMutate ? getProjectManagers() : Promise.resolve([]),
    canMutate ? getClientRefs() : Promise.resolve([]),
  ]);

  if (!project) notFound();

  const canAssignTeam = role === "admin" || project.manager_id === user?.id;

  const rows = mergeChecklistRows(records);
  const sections = computeSectionSummaries(rows);

  const t = await getTranslations("checklist");
  const tPhase = await getTranslations("projectPhase");
  const tStatus = await getTranslations("projectStatus");
  const tProjects = await getTranslations("projects");
  const tDocs = await getTranslations("documents");

  const leafPcts = rows
    .filter((r) => !r.isSection && r.pct !== null)
    .map((r) => r.pct as number);
  const overallPct =
    leafPcts.length > 0
      ? Math.round(leafPcts.reduce((a, b) => a + b, 0) / leafPcts.length)
      : 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-[11px] text-veltol-fgMute">
        <Link href="/projects" className="transition-colors hover:text-veltol-fgDim">
          {t("breadcrumbProjects")}
        </Link>
        <span>/</span>
        <span className="text-veltol-fgDim">{project.name}</span>
        <span>/</span>
        <span className="text-veltol-accent">
          {isDocumentsTab ? tDocs("breadcrumb") : isGanttTab ? t("gantt.breadcrumb") : t("breadcrumbChecklist")}
        </span>
      </nav>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-veltol-fgMute">
            {t("eyebrow", { id: project.id })}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={phaseVariant(project.current_phase)}>
              {tPhase(project.current_phase)}
            </Badge>
            <Badge variant={projectStatusVariant(project.status)}>
              {tStatus(project.status)}
            </Badge>
            {project.county && (
              <span className="font-mono text-[11px] text-veltol-fgMute">
                {project.county}
              </span>
            )}
          </div>

          <div className="mt-3">
            {project.onedrive_folder_url ? (
              <a
                href={project.onedrive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] text-veltol-accent transition-opacity hover:opacity-75"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                {tProjects("openFolder")}
              </a>
            ) : canMutate ? (
              <LinkFolderForm projectId={project.id} />
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-mono text-[42px] font-bold leading-none tabular-nums text-veltol-accent">
            {overallPct}
            <span className="text-[22px] text-veltol-fgMute">%</span>
          </div>
          <div className="mt-1 text-xs font-medium text-veltol-fgMute">
            {t("overallCompletion")}
          </div>
        </div>
      </div>

      <ProjectOverviewPanel
        project={project}
        canMutate={canMutate}
        managers={managers}
        clientRefs={clientRefs}
        teams={teams}
        canAssignTeam={canAssignTeam}
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "checklist", label: tDocs("tab.checklist"), href: `/projects/${projectId}` },
          { key: "gantt", label: t("gantt.tabLabel"), href: `/projects/${projectId}?tab=gantt` },
          { key: "documents", label: tDocs("tab.documents"), href: `/projects/${projectId}?tab=documents` },
        ].map(({ key, label, href }) => {
          const active = key === "documents" ? isDocumentsTab : key === "gantt" ? isGanttTab : (!isDocumentsTab && !isGanttTab);
          return (
            <Link
              key={key}
              href={href}
              className={
                active
                  ? "rounded-t-md border border-b-0 border-veltol-accent/25 bg-veltol-accent/10 px-4 py-2 text-[13px] font-semibold text-veltol-accent"
                  : "px-4 py-2 text-[13px] text-veltol-fgMute transition-colors hover:text-veltol-fgDim"
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      {isDocumentsTab ? (
        <ProjectDocumentsTab
          documents={projectDocuments}
          project={project}
          canMutate={canMutate}
        />
      ) : isGanttTab ? (
        <GanttShell rows={rows} projectId={project.id} teams={teams} canMutate={canMutate} />
      ) : (
        <>
          {/* Section summary strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sections.map((s) => (
              <div key={s.phase} className="rounded-lg border border-border bg-card px-3 py-2.5">
                <div className="text-[11px] font-medium text-veltol-fgMute">
                  {t(`phase.${s.phase}`)}
                </div>
                <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-veltol-surface">
                  <div
                    className="h-full rounded-full bg-veltol-accent transition-all duration-700"
                    style={{ width: `${s.avgPct}%` }}
                  />
                </div>
                <div className="mt-1 font-mono tabular-nums text-[11px] text-veltol-fgDim">
                  {Math.round(s.avgPct)}%
                </div>
              </div>
            ))}
          </div>

          <ChecklistShell rows={rows} projectId={project.id} canMutate={canMutate} />
        </>
      )}
    </div>
  );
}
