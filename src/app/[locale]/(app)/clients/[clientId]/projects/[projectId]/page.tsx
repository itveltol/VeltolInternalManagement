import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import {
  getProject,
  getChecklistRecords,
  getProjectDocuments,
  getTeamsForProject,
  getProjectManagers,
  getClientRefs,
  getSubcontractorRefs,
  getSubcontractorAssignment,
  getMaintenanceChecks,
  getExecutionData,
  getStructureConfig,
  getCefData,
  getBessData,
} from "@/app/[locale]/(app)/projects/[id]/actions";
import { getGanttMatriceData } from "@/app/[locale]/(app)/gantt/actions";
import { getProjectTimelinePage } from "@/app/[locale]/(app)/board/actions";
import { mergeChecklistRows, computeOverallPct } from "@/features/projects/checklists/services/checklistTemplate";
import { ProjectDetailView } from "@/features/projects/components/ProjectDetailView";
import { isBessProjectType, isCefProjectType } from "@/features/projects/types";

interface Props {
  params: Promise<{ locale: string; clientId: string; projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ClientProjectDetailPage({ params, searchParams }: Props) {
  const { clientId, projectId: idParam } = await params;
  const { tab } = await searchParams;
  const clientIdNum = Number(clientId);
  const projectId = Number(idParam);
  if (isNaN(clientIdNum) || isNaN(projectId)) notFound();

  const { user, role } = await getUserProfileRole();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");

  const project = await getProject(projectId);
  if (!project || project.client_id !== clientIdNum) notFound();

  const isDocumentsTab = tab === "documents";
  const isGanttTab = tab === "gantt";
  const isMaintenanceTab = tab === "maintenance";
  const isComunicareTab = tab === "comunicare";

  const isSubcontracted = project.execution_mode === "subcontracted";
  const hasMaintenance = project.contract_type.includes("mentenanta");
  const hasBess = isBessProjectType(project.project_type);
  const hasCef = isCefProjectType(project.project_type);

  const [records, projectDocuments, teams, managers, clientRefs, subcontractorRefs, currentAssignment, ganttMatriceData, maintenanceChecks, timelinePage, executionData, structureConfig, cefData, bessData] =
    await Promise.all([
      isSubcontracted ? Promise.resolve([]) : getChecklistRecords(projectId),
      isDocumentsTab ? getProjectDocuments(projectId) : Promise.resolve([]),
      canMutate ? getTeamsForProject() : Promise.resolve([]),
      canMutate ? getProjectManagers() : Promise.resolve([]),
      canMutate ? getClientRefs() : Promise.resolve([]),
      canMutate ? getSubcontractorRefs() : Promise.resolve([]),
      canMutate ? getSubcontractorAssignment(projectId) : Promise.resolve(null),
      isGanttTab || isSubcontracted ? getGanttMatriceData([projectId]) : Promise.resolve({ activities: [], phases: [], cells: [], checklistRecordsByProjectId: {} }),
      hasMaintenance && isMaintenanceTab ? getMaintenanceChecks(projectId) : Promise.resolve([]),
      isComunicareTab ? getProjectTimelinePage(projectId, 0) : Promise.resolve({ items: [], hasMore: false }),
      isSubcontracted ? Promise.resolve(null) : getExecutionData(projectId),
      isSubcontracted ? Promise.resolve([]) : getStructureConfig(projectId),
      hasCef ? getCefData(projectId) : Promise.resolve(null),
      hasBess ? getBessData(projectId) : Promise.resolve(null),
    ]);
  const { activities, phases, cells } = ganttMatriceData;
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();

  const canAssignTeam = role === "admin" || project.manager_id === user?.id;

  const rows = mergeChecklistRows(records, hasBess);

  const t = await getTranslations("checklist");
  const tDocs = await getTranslations("documents");
  const tMaintenance = await getTranslations("maintenance");
  const tComms = await getTranslations("comms");

  const overallPct = computeOverallPct(rows);

  const initialTab = isDocumentsTab ? "documents" : isGanttTab ? "gantt" : isMaintenanceTab && hasMaintenance ? "maintenance" : isComunicareTab ? "comunicare" : "checklist";

  const activeTabLabel = isDocumentsTab ? tDocs("breadcrumb") : isGanttTab ? t("gantt.breadcrumb") : isMaintenanceTab ? tMaintenance("breadcrumb") : isComunicareTab ? tComms("breadcrumb") : t("breadcrumbChecklist");

  return (
    <ProjectDetailView
      breadcrumb={[
        { label: project.name },
        { label: activeTabLabel },
      ]}
      project={project}
      initialTab={initialTab}
      isSubcontracted={isSubcontracted}
      hasMaintenance={hasMaintenance}
      hasBess={hasBess}
      canMutate={canMutate}
      canAssignTeam={canAssignTeam}
      todayMs={todayMs}
      overallPct={overallPct}
      records={records}
      executionData={executionData}
      structureConfig={structureConfig}
      cefData={cefData}
      bessData={bessData}
      managers={managers}
      clientRefs={clientRefs}
      subcontractorRefs={subcontractorRefs}
      currentAssignment={currentAssignment}
      teams={teams}
      initialActivities={activities}
      initialPhases={phases}
      initialCells={cells}
      initialDocuments={projectDocuments}
      initialMaintenanceChecks={maintenanceChecks}
      initialTimelinePage={timelinePage}
    />
  );
}
