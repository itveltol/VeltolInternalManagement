import type { ChecklistApiClient, UpsertChecklistItemPayload, ScheduleItemPayload, CreateCustomTaskPayload } from "../api/types";
import type { ChecklistItemRecord, DailyLogRecord } from "@/features/projects/checklists/types";

export async function getChecklistRecords(
  client: ChecklistApiClient,
  projectId: number
): Promise<ChecklistItemRecord[]> {
  return client.getChecklistRecords(projectId);
}

export async function upsertChecklistItem(
  client: ChecklistApiClient,
  payload: UpsertChecklistItemPayload
): Promise<void> {
  return client.upsertChecklistItem(payload);
}

export async function logTodayRealizat(
  client: ChecklistApiClient,
  itemId: number,
  projectId: number,
  realizat: number
): Promise<void> {
  const logDate = new Date().toISOString().slice(0, 10);
  await client.logTodayRealizat({ itemId, projectId, realizat, logDate });
  await client.recomputeRealizat(itemId);
}

export async function getDailyLog(
  client: ChecklistApiClient,
  itemId: number
): Promise<DailyLogRecord[]> {
  return client.getDailyLog(itemId);
}

export async function scheduleChecklistItem(
  client: ChecklistApiClient,
  payload: ScheduleItemPayload
): Promise<void> {
  return client.scheduleChecklistItem(payload);
}

export async function createCustomTask(
  client: ChecklistApiClient,
  payload: CreateCustomTaskPayload
): Promise<{ itemNumber: number }> {
  return client.createCustomTask(payload);
}

export async function deleteCustomTask(
  client: ChecklistApiClient,
  projectId: number,
  itemNumber: number
): Promise<void> {
  return client.deleteCustomTask(projectId, itemNumber);
}
