import type { ScheduleEntry, WeekNote } from "../types";

export interface CreateScheduleEntryPayload {
  team_id: number;
  work_date: string;
  project_id: number | null;
  label: string;
  color: string | null;
  sort_order: number;
}

export interface UpdateScheduleEntryPayload {
  project_id: number | null;
  label: string;
  color: string | null;
}

export interface ScheduleWeekResult {
  entries: ScheduleEntry[];
  notes: WeekNote[];
}

export interface ScheduleApiClient {
  getWeek(weekStart: string, weekEnd: string): Promise<ScheduleWeekResult>;
  createEntry(payload: CreateScheduleEntryPayload, userId: string): Promise<{ id: number }>;
  updateEntry(id: number, payload: UpdateScheduleEntryPayload, userId: string): Promise<void>;
  deleteEntry(id: number): Promise<void>;
  upsertWeekNote(teamId: number, weekStart: string, note: string): Promise<void>;
}
