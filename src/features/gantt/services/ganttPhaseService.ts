import type { Activity, MatricePhase, MatrixCell } from "@/features/matrice/types";
import { resolveStatus } from "@/features/matrice/services/matriceService";
import type { Project } from "@/features/projects/types";
import { isBessProjectType } from "@/features/projects/types";
import type { ChecklistItemRecord } from "@/features/projects/checklists/types";
import { mergeChecklistRows, computeExecutionDurationDays } from "@/features/projects/checklists/services/checklistTemplate";
import { DAY_MS, toDayMs, addDays } from "@/shared/utils/ganttTimeline";
import {
  GANTT_PHASE_KEYS,
  GANTT_PHASE_DATE_FIELDS,
  type GanttPhaseKey,
  type GanttPhaseSegment,
  type GanttVariance,
  type ProjectGanttRow,
} from "../types";

/** Aggregate completion % across a set of matrice phase ids (mirrors matriceService.phaseCompletionPct) */
export function ganttPhaseCompletionPct(
  activities: Activity[],
  cells: MatrixCell[],
  projectId: number,
  phaseIds: number[],
): number {
  const eligible = activities.filter((a) => phaseIds.includes(a.phase_id) && !a.is_section_header);
  const nonNa = eligible.filter((a) => resolveStatus(cells, projectId, a.id) !== "na");
  if (nonNa.length === 0) return 0;
  const done = nonNa.filter((a) => resolveStatus(cells, projectId, a.id) === "finalizat");
  return Math.round((done.length / nonNa.length) * 100);
}

/** Compare actual progress against the elapsed fraction of the estimated window */
export function segmentVariance(
  pct: number,
  startDate: string | null,
  endDate: string | null,
  todayMs: number,
): GanttVariance {
  if (!startDate || !endDate) return null;
  const start = toDayMs(startDate);
  const end = toDayMs(endDate) + DAY_MS;
  if (end <= start) return null;

  const expectedPct = Math.round(
    Math.min(1, Math.max(0, (todayMs - start) / (end - start))) * 100,
  );

  if (pct >= 100) return "on_track";
  if (pct >= expectedPct) return "ahead";
  if (expectedPct - pct >= 10) return "behind";
  return "on_track";
}

export type PhaseDateValidationError = "endBeforeStart";

/** Ensure a phase's [start, end] window is internally consistent: end can't precede its own start. */
export function validatePhaseDates(
  startDate: string | null,
  endDate: string | null,
): PhaseDateValidationError | null {
  if (startDate && endDate && toDayMs(endDate) < toDayMs(startDate)) {
    return "endBeforeStart";
  }

  return null;
}

export function buildProjectGanttRows(
  projects: Project[],
  activities: Activity[],
  phases: MatricePhase[],
  cells: MatrixCell[],
  todayMs: number,
  checklistRecordsByProjectId: Record<number, ChecklistItemRecord[]> = {},
): ProjectGanttRow[] {
  const phaseIdsByGanttKey = new Map<GanttPhaseKey, number[]>();
  const serviceTypeByGanttKey = new Map<GanttPhaseKey, MatricePhase["service_type"]>();
  for (const phase of phases) {
    if (!phase.gantt_phase_key) continue;
    const key = phase.gantt_phase_key as GanttPhaseKey;
    const ids = phaseIdsByGanttKey.get(key) ?? [];
    ids.push(phase.id);
    phaseIdsByGanttKey.set(key, ids);
    // Every phase rolled into the same Gantt bucket is expected to share one
    // contract-type gate; last one wins if they ever diverge, since a bucket
    // can only be enabled/disabled as a whole segment.
    serviceTypeByGanttKey.set(key, phase.service_type);
  }

  return projects.map((project) => {
    const segments: GanttPhaseSegment[] = GANTT_PHASE_KEYS.map((key) => {
      const pct = ganttPhaseCompletionPct(activities, cells, project.id, phaseIdsByGanttKey.get(key) ?? []);
      const fields = GANTT_PHASE_DATE_FIELDS[key];
      const isSubcontractedExecution = key === "execution" && project.execution_mode === "subcontracted";
      const startDate =
        isSubcontractedExecution && project.subcontractor?.start_date
          ? project.subcontractor.start_date
          : (project[fields.start] as string | null) ?? null;

      let endDate: string | null;
      if (isSubcontractedExecution) {
        endDate = project.subcontractor?.deadline
          ? project.subcontractor.deadline
          : (project[fields.end] as string | null) ?? null;
      } else if (key === "execution" && startDate) {
        const records = checklistRecordsByProjectId[project.id] ?? [];
        const rows = mergeChecklistRows(records, isBessProjectType(project.project_type));
        const durationDays = computeExecutionDurationDays(rows);
        endDate = durationDays > 0 ? addDays(startDate, durationDays - 1) : startDate;
      } else {
        endDate = (project[fields.end] as string | null) ?? null;
      }

      return {
        key,
        pct,
        startDate,
        endDate,
        variance: segmentVariance(pct, startDate, endDate, todayMs),
        disabled: (() => {
          const serviceType = serviceTypeByGanttKey.get(key);
          return !serviceType || !project.contract_type.includes(serviceType);
        })(),
      };
    });
    return { project, segments };
  });
}
