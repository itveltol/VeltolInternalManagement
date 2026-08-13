import type { ChecklistItemRecord, DailyLogRecord } from "@/features/projects/checklists/types";

export interface UpsertChecklistItemPayload {
  projectId: number;
  itemNumber: number;
  plan_total: number | null;
  zile: number | null;
  persons_allocated: number | null;
  units_per_person_day: number | null;
  notes: string | null;
}

export interface LogTodayPayload {
  itemId: number;
  projectId: number;
  realizat: number;
  logDate: string;
}

export interface ChecklistApiClient {
  getChecklistRecords(projectId: number): Promise<ChecklistItemRecord[]>;
  getChecklistRecordsForProjects(projectIds: number[]): Promise<ChecklistItemRecord[]>;
  upsertChecklistItem(payload: UpsertChecklistItemPayload): Promise<void>;
  logTodayRealizat(payload: LogTodayPayload): Promise<void>;
  recomputeRealizat(itemId: number): Promise<number>;
  getDailyLog(itemId: number): Promise<DailyLogRecord[]>;
}
