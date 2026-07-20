import type { Project, ContractType } from "@/features/projects/types";

export type GanttPhaseKey = "planning" | "execution" | "autorizare";

/**
 * Maps each Gantt workflow phase to the contract service it corresponds to,
 * so a segment can be marked disabled when the project's contract doesn't
 * cover that service — without ever discarding its persisted dates/progress.
 */
export const CONTRACT_TYPE_BY_PHASE: Record<GanttPhaseKey, ContractType> = {
  planning: "proiectare",
  execution: "executie",
  autorizare: "mentenanta",
};

export const GANTT_PHASE_KEYS: GanttPhaseKey[] = ["planning", "execution", "autorizare"];

/** Matrice `activities.phase_no` values rolled up into each portfolio-Gantt phase */
export const GANTT_PHASE_MATRICE_RANGE: Record<GanttPhaseKey, number[]> = {
  planning: [1, 2, 3, 4, 5, 6, 7],
  execution: [8, 9, 10],
  autorizare: [11, 12],
};

export const GANTT_PHASE_DATE_FIELDS: Record<
  GanttPhaseKey,
  { start: keyof Project; end: keyof Project }
> = {
  planning: { start: "planning_start_date", end: "planning_end_date" },
  execution: { start: "execution_start_date", end: "execution_end_date" },
  autorizare: { start: "autorizare_start_date", end: "autorizare_end_date" },
};

export const GANTT_PHASE_COLOR: Record<GanttPhaseKey, { fill: string; line: string }> = {
  planning: { fill: "bg-veltol-primary/70 border-veltol-primary", line: "bg-veltol-primary" },
  execution: { fill: "bg-veltol-accent/70 border-veltol-accent", line: "bg-veltol-accent" },
  autorizare: { fill: "bg-veltol-green/70 border-veltol-green", line: "bg-veltol-green" },
};

export type GanttVariance = "ahead" | "on_track" | "behind" | null;

export interface GanttPhaseSegment {
  key: GanttPhaseKey;
  pct: number;
  startDate: string | null;
  endDate: string | null;
  variance: GanttVariance;
  /** True when the project's contract_type doesn't cover this phase's service */
  disabled: boolean;
}

export interface ProjectGanttRow {
  project: Project;
  segments: GanttPhaseSegment[];
}
