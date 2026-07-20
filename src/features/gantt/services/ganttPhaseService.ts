import type { Activity, MatrixCell } from "@/features/matrice/types";
import { resolveStatus } from "@/features/matrice/services/matriceService";
import type { Project } from "@/features/projects/types";
import {
  GANTT_PHASE_KEYS,
  GANTT_PHASE_DATE_FIELDS,
  GANTT_PHASE_MATRICE_RANGE,
  CONTRACT_TYPE_BY_PHASE,
  type GanttPhaseKey,
  type GanttPhaseSegment,
  type GanttVariance,
  type ProjectGanttRow,
} from "../types";

/** Aggregate completion % across a set of matrice phase_no values (mirrors matriceService.phaseCompletionPct) */
export function ganttPhaseCompletionPct(
  activities: Activity[],
  cells: MatrixCell[],
  projectId: number,
  phaseNos: number[],
): number {
  const eligible = activities.filter((a) => phaseNos.includes(a.phase_no) && !a.is_section_header);
  const nonNa = eligible.filter((a) => resolveStatus(cells, projectId, a.id) !== "na");
  if (nonNa.length === 0) return 0;
  const done = nonNa.filter((a) => resolveStatus(cells, projectId, a.id) === "finalizat");
  return Math.round((done.length / nonNa.length) * 100);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayMs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
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

export type PhaseDateValidationError =
  | "endBeforeStart"
  | "startBeforePreviousEnd"
  | "endAfterNextStart";

/**
 * Ensure a phase's [start, end] window is internally consistent and doesn't
 * overlap the adjacent phases' windows: end can't precede its own start,
 * start can't precede the previous phase's end, and end can't follow the
 * next phase's start.
 */
export function validatePhaseDates(
  phaseKey: GanttPhaseKey,
  startDate: string | null,
  endDate: string | null,
  project: Project,
): PhaseDateValidationError | null {
  if (startDate && endDate && toDayMs(endDate) < toDayMs(startDate)) {
    return "endBeforeStart";
  }

  const index = GANTT_PHASE_KEYS.indexOf(phaseKey);

  const previousKey = GANTT_PHASE_KEYS[index - 1];
  if (startDate && previousKey) {
    const previousEnd = project[GANTT_PHASE_DATE_FIELDS[previousKey].end] as string | null;
    if (previousEnd && toDayMs(startDate) < toDayMs(previousEnd)) {
      return "startBeforePreviousEnd";
    }
  }

  const nextKey = GANTT_PHASE_KEYS[index + 1];
  if (endDate && nextKey) {
    const nextStart = project[GANTT_PHASE_DATE_FIELDS[nextKey].start] as string | null;
    if (nextStart && toDayMs(endDate) > toDayMs(nextStart)) {
      return "endAfterNextStart";
    }
  }

  return null;
}

export function buildProjectGanttRows(
  projects: Project[],
  activities: Activity[],
  cells: MatrixCell[],
  todayMs: number,
): ProjectGanttRow[] {
  return projects.map((project) => {
    const segments: GanttPhaseSegment[] = GANTT_PHASE_KEYS.map((key) => {
      const pct = ganttPhaseCompletionPct(activities, cells, project.id, GANTT_PHASE_MATRICE_RANGE[key]);
      const fields = GANTT_PHASE_DATE_FIELDS[key];
      const startDate = (project[fields.start] as string | null) ?? null;
      const endDate = (project[fields.end] as string | null) ?? null;
      return {
        key,
        pct,
        startDate,
        endDate,
        variance: segmentVariance(pct, startDate, endDate, todayMs),
        disabled: !project.contract_type.includes(CONTRACT_TYPE_BY_PHASE[key]),
      };
    });
    return { project, segments };
  });
}
