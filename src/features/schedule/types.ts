export interface ScheduleEntryProject {
  id: number;
  name: string;
}

export interface ScheduleEntry {
  id: number;
  team_id: number;
  work_date: string;
  project_id: number | null;
  project?: ScheduleEntryProject | null;
  label: string;
  color: string | null;
  sort_order: number;
}

export interface WeekNote {
  team_id: number;
  week_start: string;
  note: string;
}

export interface ScheduleDayGroup {
  date: string;
  entries: ScheduleEntry[];
}

export interface TeamScheduleMember {
  id: string;
  name: string;
  kind?: "profile" | "worker";
}

export interface TeamScheduleRow {
  team_id: number;
  team_name: string;
  members: TeamScheduleMember[];
  days: ScheduleDayGroup[];
  note: string;
}

export interface WeekGrid {
  weekStart: string;
  rows: TeamScheduleRow[];
}
