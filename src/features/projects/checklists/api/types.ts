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

export interface ChecklistApiClient {
  getChecklistRecords(projectId: number): Promise<ChecklistItemRecord[]>;
  upsertChecklistItem(payload: UpsertChecklistItemPayload): Promise<void>;
  logTodayRealizat(payload: LogTodayPayload): Promise<void>;
  recomputeRealizat(itemId: number): Promise<number>;
  getDailyLog(itemId: number): Promise<DailyLogRecord[]>;
}
