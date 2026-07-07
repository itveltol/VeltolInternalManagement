import type { HolidaysApiClient, CreateHolidayPayload } from "../api/types";
import type { Holiday } from "../types";

export async function getHolidays(client: HolidaysApiClient): Promise<Holiday[]> {
  return client.getHolidays();
}

export async function createHoliday(
  client: HolidaysApiClient,
  payload: CreateHolidayPayload,
): Promise<{ id: number }> {
  return client.createHoliday(payload);
}

export async function deleteHoliday(client: HolidaysApiClient, id: number): Promise<void> {
  return client.deleteHoliday(id);
}
