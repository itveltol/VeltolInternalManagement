import type { Project } from "@/features/projects/types";

export type GanttPhaseKey = "planning" | "execution" | "autorizare";

export const GANTT_PHASE_KEYS: GanttPhaseKey[] = ["planning", "execution", "autorizare"];

export const GANTT_PHASE_DATE_FIELDS: Record<
  GanttPhaseKey,
  { start: keyof Project; end: keyof Project }
> = {
  planning: { start: "planning_start_date", end: "planning_end_date" },
  execution: { start: "execution_start_date", end: "execution_end_date" },
  autorizare: { start: "autorizare_start_date", end: "autorizare_end_date" },
};

export const GANTT_PHASE_COLOR: Record<GanttPhaseKey, { fill: string; line: string; dot: string }> = {
  planning: { fill: "bg-veltol-primary border-veltol-primary", line: "bg-veltol-primary", dot: "bg-veltol-primary" },
  execution: { fill: "bg-veltol-primaryHi border-veltol-primaryHi", line: "bg-veltol-primaryHi", dot: "bg-veltol-primaryHi" },
  autorizare: { fill: "bg-veltol-green border-veltol-green", line: "bg-veltol-green", dot: "bg-veltol-green" },
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
