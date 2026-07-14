import type { ChecklistItemRecord, DailyLogRecord } from "@/features/projects/checklists/types";

export interface UpsertChecklistItemPayload {
  projectId: number;
  itemNumber: number;
  plan_total: number | null;
  zile: number | null;
  notes: string | null;
}

export interface LogTodayPayload {
  itemId: number;
  projectId: number;
  realizat: number;
  logDate: string;
}

export interface ScheduleItemPayload {
  projectId: number;
  itemNumber: number;
  start_date: string | null;
  end_date: string | null;
  team_id: number | null;
}

export interface CreateCustomTaskPayload {
  projectId: number;
  name: string;
  phase: string;
  plan_total: number | null;
  zile: number | null;
  start_date: string | null;
  end_date: string | null;
  team_id: number | null;
}

export interface ChecklistApiClient {
  getChecklistRecords(projectId: number): Promise<ChecklistItemRecord[]>;
  upsertChecklistItem(payload: UpsertChecklistItemPayload): Promise<void>;
  logTodayRealizat(payload: LogTodayPayload): Promise<void>;
  recomputeRealizat(itemId: number): Promise<number>;
  getDailyLog(itemId: number): Promise<DailyLogRecord[]>;
  scheduleChecklistItem(payload: ScheduleItemPayload): Promise<void>;
  createCustomTask(payload: CreateCustomTaskPayload): Promise<{ itemNumber: number }>;
  deleteCustomTask(projectId: number, itemNumber: number): Promise<void>;
}
