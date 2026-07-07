import type { Holiday } from "../types";

export interface CreateHolidayPayload {
  date: string;
  name: string;
}

export interface HolidaysApiClient {
  getHolidays(): Promise<Holiday[]>;
  createHoliday(payload: CreateHolidayPayload): Promise<{ id: number }>;
  deleteHoliday(id: number): Promise<void>;
}
