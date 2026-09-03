export type ScheduleAssigneeKind = "profile" | "worker";

export interface ScheduleAssignee {
  /** profile uuid, or `worker:<id>` for team_workers — same disambiguation used elsewhere in this feature */
  id: string;
  name: string;
  kind: ScheduleAssigneeKind;
}

/** One assignee's state for one specific day: whether they're on approved leave that day, shown alongside the card's shared delegation/hours. */
export interface ScheduleAssigneeDayState {
  assignee: ScheduleAssignee;
  onVacation: boolean;
}

export interface ScheduleAssignmentDay {
  work_date: string;
  delegated: boolean;
  plus_hours: number;
  /** Per-assignee vacation state for this specific day — a card can have some assignees on leave and others not. */
  assignees: ScheduleAssigneeDayState[];
}

export interface ScheduleAssignment {
  id: number;
  project_id: number | null;
  /** The card's own PM/sales — independent of the linked project's manager_id/sales_id, if any. */
  pm: { id: string; name: string } | null;
  sales: { id: string; name: string } | null;
  assignees: ScheduleAssignee[];
  start_date: string;
  end_date: string;
  label: string;
  color: string | null;
  /** Only days that fall within both the assignment's own range and the visible week, pre-merged with defaults */
  days: ScheduleAssignmentDay[];
}

export interface ScheduleProjectCard {
  project_id: number | null;
  /** null for the "no project" pseudo-card grouping label-only assignments. */
  project_name: string | null;
  assignments: ScheduleAssignment[];
}

export interface WeekGrid {
  weekStart: string;
  weekEnd: string;
  cards: ScheduleProjectCard[];
}

/** One project manager's assigned schedule color, and the manager's own display name for the color-management list. */
export interface PmColorEntry {
  pm_id: string;
  name: string;
  color: string | null;
}

/** Lightweight project search result, used by the assignee/project pickers. */
export interface ScheduleProjectOption {
  id: number;
  name: string;
  manager: { id: string; name: string } | null;
  sales: { id: string; name: string } | null;
}

export type ScheduleRowGroup =
  | { kind: "team"; team_id: number; team_name: string }
  | { kind: "custom" };

/** One assignment instance rendered inside a single day column of the calendar grid. */
export interface ScheduleDayCard {
  assignment_id: number;
  project_id: number | null;
  project_name: string | null;
  pm: { id: string; name: string } | null;
  sales: { id: string; name: string } | null;
  /** Whether this card's assignees match one real team, or are a "Custom" mix. */
  rowGroup: ScheduleRowGroup;
  label: string;
  color: string | null;
  start_date: string;
  end_date: string;
  /** This specific day's delegation/hours state (shared by the whole card) plus each assignee's vacation state that day. */
  day: ScheduleAssignmentDay;
}

export interface ScheduleDayColumn {
  date: string;
  cards: ScheduleDayCard[];
}

/** One row in the calendar table: a real team's name, or the fixed "Custom" catch-all, plus per-day cards. */
export interface ScheduleTeamRow {
  team_id: number | null;
  team_name: string;
  days: ScheduleDayColumn[];
}

/** One person's worked-hours totals for a visible week, derived from their assignment days (see summarizeWorkerHours). */
export interface WorkerHoursSummary {
  assignee: ScheduleAssignee;
  normalDays: number;
  delegationDays: number;
  baseHours: number;
  plusHours: number;
  totalHours: number;
}
