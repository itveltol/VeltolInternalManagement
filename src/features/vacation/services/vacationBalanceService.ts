import { ANNUAL_VACATION_DAYS, MAX_CARRYOVER_DAYS, vacationDays } from "../types";
import type { VacationBalance, VacationRequest } from "../types";

export const POLICY_START_YEAR = 2026;

export function daysUsedInYear(
  requests: VacationRequest[],
  userId: string,
  year: number,
  holidays: ReadonlySet<string> = new Set(),
): number {
  return requests
    .filter(
      (r) =>
        r.user_id === userId &&
        r.status === "approved" &&
        new Date(r.start_date).getFullYear() === year,
    )
    .reduce((sum, r) => sum + vacationDays(r.start_date, r.end_date, holidays), 0);
}

export function computeCarryover(
  requests: VacationRequest[],
  userId: string,
  priorYear: number,
  holidays: ReadonlySet<string> = new Set(),
): number {
  if (priorYear < POLICY_START_YEAR) return 0;
  const remainingAtYearEnd =
    ANNUAL_VACATION_DAYS +
    computeCarryover(requests, userId, priorYear - 1, holidays) -
    daysUsedInYear(requests, userId, priorYear, holidays);
  return Math.min(MAX_CARRYOVER_DAYS, Math.max(0, remainingAtYearEnd));
}

export function computeBalance(
  requests: VacationRequest[],
  userId: string,
  year: number,
  holidays: ReadonlySet<string> = new Set(),
): VacationBalance {
  const carriedOverDays = computeCarryover(requests, userId, year - 1, holidays);
  const usedDays = daysUsedInYear(requests, userId, year, holidays);
  return {
    year,
    baseDays: ANNUAL_VACATION_DAYS,
    carriedOverDays,
    usedDays,
    remainingDays: ANNUAL_VACATION_DAYS + carriedOverDays - usedDays,
  };
}
