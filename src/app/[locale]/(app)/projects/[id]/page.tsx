import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getProject, getChecklistRecords, getProjectDocuments, getProjectFolderChildren, getProjectManagers, getClientRefs, getSubcontractorRefs, getSubcontractorAssignment, getMaintenanceChecks, getExecutionData, getStructureConfig, getCefData, getBessData } from "./actions";
import { getProjectContracts } from "@/app/[locale]/(app)/projects/actions";
import { getGanttMatriceData } from "@/app/[locale]/(app)/gantt/actions";
import { mergeChecklistRows, computeOverallPct } from "@/features/projects/checklists/services/checklistTemplate";
import { ProjectDetailView } from "@/features/projects/components/ProjectDetailView";
import { getProjectTimelinePage } from "@/app/[locale]/(app)/board/actions";
import { isBessProjectType, isCefProjectType } from "@/features/projects/types";
import { timed } from "@/shared/utils/perfTimer";

interface Props {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectChecklistPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;
  const projectId = Number(id);
  if (isNaN(projectId)) notFound();

  const renderStart = performance.now();
  const { user, role } = await timed("page.getUserProfileRole", getUserProfileRole());

  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");

  const isDocumentsTab = tab === "documents";
  const isGanttTab = tab === "gantt";
  const isMaintenanceTab = tab === "maintenance";
  const isComunicareTab = tab === "comunicare";

  // These don't depend on the project row, so fetch them alongside it rather
  // than waiting for it — saves a sequential round trip on every render,
  // including the re-render after each contract/project save.
  const [project, managers, clientRefs, subcontractorRefs, currentAssignment, contracts] = await Promise.all([
    timed("page.getProject", getProject(projectId)),
    timed("page.managers", canMutate ? getProjectManagers() : Promise.resolve([])),
    timed("page.clientRefs", canMutate ? getClientRefs() : Promise.resolve([])),
    timed("page.subcontractorRefs", canMutate ? getSubcontractorRefs() : Promise.resolve([])),
    timed("page.assignment", canMutate ? getSubcontractorAssignment(projectId) : Promise.resolve(null)),
    timed("page.contracts", getProjectContracts(projectId)),
  
  ]);
  if (!project) notFound();

  const isSubcontracted = project.execution_mode === "subcontracted";
  const isResidential = project.project_category === "residential";
  const hasMaintenance = project.contract_type.includes("mentenanta");
  const hasBess = isBessProjectType(project.project_type);
  const hasCef = isCefProjectType(project.project_type);

  const [records, projectDocuments, folderChildren, ganttMatriceData, maintenanceChecks, timelinePage, executionData, structureConfig, cefData, bessData] =
    await Promise.all([
      timed("page.checklistRecords", Promise.resolve(isSubcontracted || isResidential ? Promise.resolve([]) : getChecklistRecords(projectId))),
      timed("page.documents", Promise.resolve(isDocumentsTab || isResidential ? getProjectDocuments(projectId) : Promise.resolve([]))),
      timed("page.folderChildren", Promise.resolve((isDocumentsTab || isResidential) && project.onedrive_folder_id ? getProjectFolderChildren(project.onedrive_folder_id) : Promise.resolve([]))),
      timed("page.ganttMatrice", Promise.resolve(!isResidential && (isGanttTab || isSubcontracted) ? getGanttMatriceData([projectId]) : Promise.resolve({ activities: [], phases: [], cells: [], checklistRecordsByProjectId: {} }))),
      timed("page.maintenanceChecks", Promise.resolve(hasMaintenance && isMaintenanceTab && !isResidential ? getMaintenanceChecks(projectId) : Promise.resolve([]))),
      timed("page.timeline", Promise.resolve(isComunicareTab && !isResidential ? getProjectTimelinePage(projectId, 0) : Promise.resolve({ items: [], hasMore: false }))),
      timed("page.executionData", Promise.resolve(isSubcontracted || isResidential ? Promise.resolve(null) : getExecutionData(projectId))),
      timed("page.structureConfig", Promise.resolve(isSubcontracted || isResidential ? Promise.resolve([]) : getStructureConfig(projectId))),
      timed("page.cefData", Promise.resolve(hasCef ? getCefData(projectId) : Promise.resolve(null))),
      timed("page.bessData", Promise.resolve(hasBess ? getBessData(projectId) : Promise.resolve(null))),
    ]);
  console.log(`[perf] page data total ${Math.round(performance.now() - renderStart)}ms`);
  const { activities, phases, cells } = ganttMatriceData;
  const todayMs = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();

  const rows = mergeChecklistRows(records, hasBess);

  const t = await getTranslations("checklist");
  const tDocs = await getTranslations("documents");
  const tMaintenance = await getTranslations("maintenance");
  const tComms = await getTranslations("comms");

  const overallPct = computeOverallPct(rows);

  const initialTab = isResidential
    ? "documents"
    : isDocumentsTab ? "documents" : isGanttTab || (isSubcontracted && !isMaintenanceTab && !isComunicareTab) ? "gantt" : isMaintenanceTab && hasMaintenance ? "maintenance" : isComunicareTab ? "comunicare" : "checklist";

  const activeTabLabel = isResidential
    ? tDocs("breadcrumb")
    : isDocumentsTab ? tDocs("breadcrumb") : initialTab === "gantt" ? t("gantt.breadcrumb") : isMaintenanceTab ? tMaintenance("breadcrumb") : isComunicareTab ? tComms("breadcrumb") : t("breadcrumbChecklist");

  return (
    <ProjectDetailView
      breadcrumb={[
        { label: t("breadcrumbProjects"), href: "/projects" },
        { label: project.name },
        { label: activeTabLabel },
      ]}
      project={project}
      contracts={contracts}
      initialTab={initialTab}
      isSubcontracted={isSubcontracted}
      hasMaintenance={hasMaintenance}
      hasBess={hasBess}
      canMutate={canMutate}
      isAdmin={role === "admin"}
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
      initialActivities={activities}
      initialPhases={phases}
      initialCells={cells}
      initialDocuments={projectDocuments}
      initialFolderChildren={folderChildren}
      initialMaintenanceChecks={maintenanceChecks}
      initialTimelinePage={timelinePage}
    />
  );
}
