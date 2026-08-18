"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getGanttMatriceData } from "@/app/[locale]/(app)/gantt/actions";
import { getProjectDocuments, getMaintenanceChecks } from "@/app/[locale]/(app)/projects/[id]/actions";
import { getProjectTimelinePage } from "@/app/[locale]/(app)/board/actions";
import { mergeChecklistRows, computeSectionSummaries } from "@/features/projects/checklists/services/checklistTemplate";
import { ChecklistShell } from "@/features/projects/checklists/components/ChecklistShell";
import { ProjectExecutionDataPanel } from "@/features/projects/executionData/components/ProjectExecutionDataPanel";
import { ProjectPhaseGanttShell } from "@/features/gantt/components/ProjectPhaseGanttShell";
import { ProjectDocumentsTab } from "@/features/documents/components/ProjectDocumentsTab";
import { MaintenanceShell } from "@/features/projects/maintenance/components/MaintenanceShell";
import { NoteThread } from "@/features/comms/components/NoteThread";
import { ProjectTimeline } from "@/features/comms/components/ProjectTimeline";
import type { Project } from "@/features/projects/types";
import type { ChecklistItemRecord } from "@/features/projects/checklists/types";
import type { Activity, MatrixCell } from "@/features/matrice/types";
import type { Document } from "@/features/documents/types";
import type { MaintenanceCheck } from "@/features/projects/maintenance/types";
import type { ProjectExecutionData, ProjectStructureConfigRow } from "@/features/projects/executionData/types";
import type { FeedItem } from "@/features/comms/types";

type TabKey = "checklist" | "gantt" | "documents" | "maintenance" | "comunicare";

interface Props {
  project: Project;
  initialTab: TabKey;
  isSubcontracted: boolean;
  hasMaintenance: boolean;
  hasBess: boolean;
  canMutate: boolean;
  todayMs: number;
  records: ChecklistItemRecord[];
  executionData: ProjectExecutionData | null;
  structureConfig: ProjectStructureConfigRow[];
  teamMemberCount: number | null;
  initialActivities: Activity[];
  initialCells: MatrixCell[];
  initialDocuments: Document[];
  initialMaintenanceChecks: MaintenanceCheck[];
  initialTimelinePage: { items: FeedItem[]; hasMore: boolean };
}

export function ProjectTabsShell({
  project,
  initialTab,
  isSubcontracted,
  hasMaintenance,
  hasBess,
  canMutate,
  todayMs,
  records,
  executionData,
  structureConfig,
  teamMemberCount,
  initialActivities,
  initialCells,
  initialDocuments,
  initialMaintenanceChecks,
  initialTimelinePage,
}: Props) {
  const t = useTranslations("checklist");
  const tDocs = useTranslations("documents");
  const tMaintenance = useTranslations("maintenance");
  const tComms = useTranslations("comms");
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [loadedTabs, setLoadedTabs] = useState<Set<TabKey>>(new Set([initialTab]));

  const [ganttData, setGanttData] = useState({ activities: initialActivities, cells: initialCells });
  const [documents, setDocuments] = useState(initialDocuments);
  const [maintenanceChecks, setMaintenanceChecks] = useState(initialMaintenanceChecks);
  const [timelinePage, setTimelinePage] = useState(initialTimelinePage);

  const rows = mergeChecklistRows(records, hasBess);
  const sections = computeSectionSummaries(rows);

  function switchTab(key: TabKey) {
    setTab(key);
    const url = new URL(window.location.href);
    const isDefaultTab = key === "checklist" || (key === "gantt" && isSubcontracted);
    if (isDefaultTab) url.searchParams.delete("tab");
    else url.searchParams.set("tab", key);
    window.history.pushState(null, "", url.pathname + url.search);

    if (loadedTabs.has(key)) return;
    setLoadedTabs((prev) => new Set(prev).add(key));

    startTransition(async () => {
      if (key === "gantt") {
        const fresh = await getGanttMatriceData([project.id]);
        setGanttData({ activities: fresh.activities, cells: fresh.cells });
      } else if (key === "documents") {
        const fresh = await getProjectDocuments(project.id);
        setDocuments(fresh);
      } else if (key === "maintenance" && hasMaintenance) {
        const fresh = await getMaintenanceChecks(project.id);
        setMaintenanceChecks(fresh);
      } else if (key === "comunicare") {
        const fresh = await getProjectTimelinePage(project.id, 0);
        setTimelinePage(fresh);
      }
    });
  }

  function reloadGanttData() {
    startTransition(async () => {
      const fresh = await getGanttMatriceData([project.id]);
      setGanttData({ activities: fresh.activities, cells: fresh.cells });
    });
  }

  function reloadMaintenanceChecks() {
    startTransition(async () => {
      const fresh = await getMaintenanceChecks(project.id);
      setMaintenanceChecks(fresh);
    });
  }

  const isGanttActive = tab === "gantt" || isSubcontracted;
  const isDocumentsActive = tab === "documents" && !isSubcontracted;
  const isMaintenanceActive = tab === "maintenance" && hasMaintenance && !isSubcontracted;
  const isComunicareActive = tab === "comunicare" && !isSubcontracted;
  const isChecklistActive = !isGanttActive && !isDocumentsActive && !isMaintenanceActive && !isComunicareActive;

  const tabs = [
    ...(isSubcontracted ? [] : [{ key: "checklist" as const, label: tDocs("tab.checklist") }]),
    { key: "gantt" as const, label: t("gantt.tabLabel") },
    ...(isSubcontracted ? [] : [{ key: "documents" as const, label: tDocs("tab.documents") }]),
    ...(hasMaintenance && !isSubcontracted ? [{ key: "maintenance" as const, label: tMaintenance("tabLabel") }] : []),
    ...(isSubcontracted ? [] : [{ key: "comunicare" as const, label: tComms("tabLabel") }]),
  ];

  return (
    <>
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label }) => {
          const active =
            key === "documents" ? isDocumentsActive
            : key === "maintenance" ? isMaintenanceActive
            : key === "comunicare" ? isComunicareActive
            : key === "gantt" ? isGanttActive
            : isChecklistActive;
          return (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={
                active
                  ? "rounded-t-md border border-b-0 border-veltol-accent/25 bg-veltol-accent/10 px-4 py-2 text-[13px] font-semibold text-veltol-accent"
                  : "px-4 py-2 text-[13px] text-veltol-fgMute transition-colors hover:text-veltol-fgDim"
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {isDocumentsActive ? (
        <ProjectDocumentsTab documents={documents} project={project} canMutate={canMutate} />
      ) : isMaintenanceActive ? (
        <MaintenanceShell
          projectId={project.id}
          checks={maintenanceChecks}
          canMutate={canMutate}
          todayMs={todayMs}
          onChanged={reloadMaintenanceChecks}
        />
      ) : isComunicareActive ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 text-[13px] font-semibold text-veltol-fg">{tComms("timeline.title")}</h2>
            <ProjectTimeline
              projectId={project.id}
              initialItems={timelinePage.items}
              initialHasMore={timelinePage.hasMore}
            />
          </div>
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <NoteThread
              anchor={{ projectId: project.id }}
              anchorLabel={`${tComms("anchorProject")} · ${project.name}`}
            />
          </div>
        </div>
      ) : isGanttActive ? (
        <ProjectPhaseGanttShell
          project={project}
          initialActivities={ganttData.activities}
          initialCells={ganttData.cells}
          checklistRecords={records}
          todayMs={todayMs}
          canMutate={canMutate}
          onChanged={reloadGanttData}
        />
      ) : (
        <>
          <ProjectExecutionDataPanel
            projectId={project.id}
            executionData={executionData}
            structureConfig={structureConfig}
            canMutate={canMutate}
          />

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

          <ChecklistShell rows={rows} projectId={project.id} canMutate={canMutate} teamMemberCount={teamMemberCount} />
        </>
      )}
    </>
  );
}
