import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getProject, getChecklistRecords, getProjectDocuments, getTeamsForProject, getProjectManagers, getClientRefs, getSubcontractorRefs, getSubcontractorAssignment, getMaintenanceChecks, getExecutionData, getStructureConfig } from "./actions";
import { getGanttMatriceData } from "@/app/[locale]/(app)/gantt/actions";
import { mergeChecklistRows, computeOverallPct } from "@/features/projects/checklists/services/checklistTemplate";
import { ProjectTabsShell } from "@/features/projects/components/ProjectTabsShell";
import { LinkFolderForm } from "@/features/projects/components/LinkFolderForm";
import { ProjectOverviewPanel } from "@/features/projects/components/ProjectOverviewPanel";
import { getProjectTimelinePage } from "@/app/[locale]/(app)/board/actions";
import { isBessProjectType } from "@/features/projects/types";
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
  const isMaintenanceTab = tab === "maintenance";
  const isComunicareTab = tab === "comunicare";

  const project = await getProject(projectId);
  if (!project) notFound();

  const isSubcontracted = project.execution_mode === "subcontracted";
  const hasMaintenance = project.contract_type.includes("mentenanta");
  const hasBess = isBessProjectType(project.project_type);

  const [records, projectDocuments, teams, managers, clientRefs, subcontractorRefs, currentAssignment, ganttMatriceData, maintenanceChecks, timelinePage, executionData, structureConfig] =
    await Promise.all([
      isSubcontracted ? Promise.resolve([]) : getChecklistRecords(projectId),
      isDocumentsTab ? getProjectDocuments(projectId) : Promise.resolve([]),
      canMutate ? getTeamsForProject() : Promise.resolve([]),
      canMutate ? getProjectManagers() : Promise.resolve([]),
      canMutate ? getClientRefs() : Promise.resolve([]),
      canMutate ? getSubcontractorRefs() : Promise.resolve([]),
      canMutate ? getSubcontractorAssignment(projectId) : Promise.resolve(null),
      isGanttTab || isSubcontracted ? getGanttMatriceData([projectId]) : Promise.resolve({ activities: [], cells: [], checklistRecordsByProjectId: {} }),
      hasMaintenance && isMaintenanceTab ? getMaintenanceChecks(projectId) : Promise.resolve([]),
      isComunicareTab ? getProjectTimelinePage(projectId, 0) : Promise.resolve({ items: [], hasMore: false }),
      isSubcontracted ? Promise.resolve(null) : getExecutionData(projectId),
      isSubcontracted ? Promise.resolve([]) : getStructureConfig(projectId),
    ]);
  const { activities, cells } = ganttMatriceData;
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();

  const canAssignTeam = role === "admin" || project.manager_id === user?.id;

  const rows = mergeChecklistRows(records, hasBess);

  const t = await getTranslations("checklist");
  const tPhase = await getTranslations("projectPhase");
  const tStatus = await getTranslations("projectStatus");
  const tProjects = await getTranslations("projects");
  const tDocs = await getTranslations("documents");
  const tMaintenance = await getTranslations("maintenance");
  const tComms = await getTranslations("comms");

  const overallPct = computeOverallPct(rows);

  const initialTab = isDocumentsTab ? "documents" : isGanttTab ? "gantt" : isMaintenanceTab && hasMaintenance ? "maintenance" : isComunicareTab ? "comunicare" : "checklist";

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
          {isDocumentsTab ? tDocs("breadcrumb") : isGanttTab ? t("gantt.breadcrumb") : isMaintenanceTab ? tMaintenance("breadcrumb") : isComunicareTab ? tComms("breadcrumb") : t("breadcrumbChecklist")}
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
            {isSubcontracted && (
              <Badge variant="secondary">{tProjects("subcontracted")}</Badge>
            )}
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

        {!isSubcontracted && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-[42px] font-bold leading-none tabular-nums text-veltol-accent">
              {overallPct}
              <span className="text-[22px] text-veltol-fgMute">%</span>
            </div>
            <div className="mt-1 text-xs font-medium text-veltol-fgMute">
              {t("overallCompletion")}
            </div>
          </div>
        )}
      </div>

      <ProjectOverviewPanel
        project={project}
        canMutate={canMutate}
        managers={managers}
        clientRefs={clientRefs}
        subcontractorRefs={subcontractorRefs}
        currentAssignment={currentAssignment}
        teams={teams}
        canAssignTeam={canAssignTeam}
      />

      <ProjectTabsShell
        project={project}
        initialTab={initialTab}
        isSubcontracted={isSubcontracted}
        hasMaintenance={hasMaintenance}
        hasBess={hasBess}
        canMutate={canMutate}
        todayMs={todayMs}
        records={records}
        executionData={executionData}
        structureConfig={structureConfig}
        teamMemberCount={project.team?.member_count ?? null}
        initialActivities={activities}
        initialCells={cells}
        initialDocuments={projectDocuments}
        initialMaintenanceChecks={maintenanceChecks}
        initialTimelinePage={timelinePage}
      />
    </div>
  );
}
