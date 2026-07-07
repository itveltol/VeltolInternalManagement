export type VacationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type VacationLeaveType = "rest" | "personal" | "medical";

export interface VacationRequest {
  id: number;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: VacationStatus;
  leave_type: VacationLeaveType;
  job_title: string | null;
  superior_name: string | null;
  substitute_name: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  requester: { first_name: string | null; last_name: string | null };
  approver: { first_name: string | null; last_name: string | null } | null;
}

export const VACATION_LEAVE_TYPES: VacationLeaveType[] = ["rest", "personal", "medical"];

export const VACATION_STATUSES: VacationStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isNonWorkingDay(date: string, holidays: ReadonlySet<string>): boolean {
  const day = new Date(date).getDay();
  return day === 0 || day === 6 || holidays.has(date);
}

export function workingDaysCount(
  start: string,
  end: string,
  holidays: ReadonlySet<string> = new Set(),
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let count = 0;
  for (
    const cursor = new Date(startDate);
    cursor.getTime() <= endDate.getTime();
    cursor.setDate(cursor.getDate() + 1)
  ) {
    if (!isNonWorkingDay(toDateKey(cursor), holidays)) count++;
  }
  return count;
}

export function vacationDays(
  start: string,
  end: string,
  holidays: ReadonlySet<string> = new Set(),
): number {
  return Math.max(1, workingDaysCount(start, end, holidays));
}

export const ANNUAL_VACATION_DAYS = 21;
export const MAX_CARRYOVER_DAYS = 5;

export interface VacationBalance {
  year: number;
  baseDays: number;
  carriedOverDays: number;
  usedDays: number;
  remainingDays: number;
}
