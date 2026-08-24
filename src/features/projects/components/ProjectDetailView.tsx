import { getTranslations } from "next-intl/server";
import { ProjectTabsShell } from "@/features/projects/components/ProjectTabsShell";
import { LinkFolderForm } from "@/features/projects/components/LinkFolderForm";
import { ProjectOverviewPanel } from "@/features/projects/components/ProjectOverviewPanel";
import { Badge } from "@/shared/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { phaseVariant, projectStatusVariant } from "@/shared/utils/status-variant";
import type { Project } from "@/features/projects/types";
import type { ProjectManager } from "@/features/projects/types";
import type { ClientRef } from "@/features/clients/types";
import type { SubcontractorRef, ProjectSubcontractorAssignment } from "@/features/subcontractors/types";
import type { Team } from "@/features/teams/types";
import type { ChecklistItemRecord } from "@/features/projects/checklists/types";
import type { Activity, MatricePhase, MatrixCell } from "@/features/matrice/types";
import type { Document } from "@/features/documents/types";
import type { MaintenanceCheck } from "@/features/projects/maintenance/types";
import type { ProjectExecutionData, ProjectStructureConfigRow } from "@/features/projects/executionData/types";
import type { FeedItem } from "@/features/comms/types";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface Props {
  breadcrumb: BreadcrumbSegment[];
  project: Project;
  initialTab: "checklist" | "gantt" | "documents" | "maintenance" | "comunicare";
  isSubcontracted: boolean;
  hasMaintenance: boolean;
  hasBess: boolean;
  canMutate: boolean;
  canAssignTeam: boolean;
  todayMs: number;
  overallPct: number;
  records: ChecklistItemRecord[];
  executionData: ProjectExecutionData | null;
  structureConfig: ProjectStructureConfigRow[];
  managers: ProjectManager[];
  clientRefs: ClientRef[];
  subcontractorRefs: SubcontractorRef[];
  currentAssignment: ProjectSubcontractorAssignment | null;
  teams: Team[];
  initialActivities: Activity[];
  initialPhases: MatricePhase[];
  initialCells: MatrixCell[];
  initialDocuments: Document[];
  initialMaintenanceChecks: MaintenanceCheck[];
  initialTimelinePage: { items: FeedItem[]; hasMore: boolean };
}

export async function ProjectDetailView({
  breadcrumb,
  project,
  initialTab,
  isSubcontracted,
  hasMaintenance,
  hasBess,
  canMutate,
  canAssignTeam,
  todayMs,
  overallPct,
  records,
  executionData,
  structureConfig,
  managers,
  clientRefs,
  subcontractorRefs,
  currentAssignment,
  teams,
  initialActivities,
  initialPhases,
  initialCells,
  initialDocuments,
  initialMaintenanceChecks,
  initialTimelinePage,
}: Props) {
  const tProjects = await getTranslations("projects");
  const t = await getTranslations("checklist");
  const tPhase = await getTranslations("projectPhase");
  const tStatus = await getTranslations("projectStatus");

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 font-mono text-[11px] text-veltol-fgMute">
        {breadcrumb.map((segment, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span>/</span>}
            {segment.href ? (
              <Link href={segment.href} className="transition-colors hover:text-veltol-fgDim">
                {segment.label}
              </Link>
            ) : i === breadcrumb.length - 1 ? (
              <span className="text-veltol-accent">{segment.label}</span>
            ) : (
              <span className="text-veltol-fgDim">{segment.label}</span>
            )}
          </span>
        ))}
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
        initialActivities={initialActivities}
        initialPhases={initialPhases}
        initialCells={initialCells}
        initialDocuments={initialDocuments}
        initialMaintenanceChecks={initialMaintenanceChecks}
        initialTimelinePage={initialTimelinePage}
      />
    </div>
  );
}
