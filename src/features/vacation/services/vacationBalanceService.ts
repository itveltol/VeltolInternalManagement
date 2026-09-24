import { ANNUAL_VACATION_DAYS, COUNTED_LEAVE_TYPES, MAX_CARRYOVER_DAYS, vacationDays } from "../types";
import type {
  VacationAdjustment,
  VacationAllowance,
  VacationBalance,
  VacationRequest,
  VacationSubject,
} from "../types";

export const POLICY_START_YEAR = 2026;

type SubjectRow = { user_id: string | null; team_worker_id: number | null };
type BalanceRequest = Pick<VacationRequest, "user_id" | "team_worker_id" | "start_date" | "end_date" | "status" | "leave_type">;

export function matchesSubject(row: SubjectRow, subject: VacationSubject): boolean {
  return subject.kind === "user" ? row.user_id === subject.id : row.team_worker_id === subject.id;
}

// Parse the year from the date string itself — new Date("YYYY-MM-DD") is UTC
// midnight and getFullYear() is local, which can drift across the boundary.
function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

function approvedDaysInYear(
  requests: BalanceRequest[],
  subject: VacationSubject,
  year: number,
  holidays: ReadonlySet<string>,
  counted: boolean,
): number {
  return requests
    .filter(
      (r) =>
        matchesSubject(r, subject) &&
        r.status === "approved" &&
        COUNTED_LEAVE_TYPES.includes(r.leave_type) === counted &&
        yearOf(r.start_date) === year,
    )
    .reduce((sum, r) => sum + vacationDays(r.start_date, r.end_date, holidays), 0);
}

export function daysUsedInYear(
  requests: BalanceRequest[],
  subject: VacationSubject,
  year: number,
  holidays: ReadonlySet<string> = new Set(),
): number {
  return approvedDaysInYear(requests, subject, year, holidays, true);
}

export function otherLeaveDaysInYear(
  requests: BalanceRequest[],
  subject: VacationSubject,
  year: number,
  holidays: ReadonlySet<string> = new Set(),
): number {
  return approvedDaysInYear(requests, subject, year, holidays, false);
}

/** Exact year's allowance, else the latest earlier year's, else the company default. */
export function baseDaysFor(allowances: VacationAllowance[], subject: VacationSubject, year: number): number {
  let best: VacationAllowance | null = null;
  for (const a of allowances) {
    if (!matchesSubject(a, subject) || a.year > year) continue;
    if (!best || a.year > best.year) best = a;
  }
  return best ? Number(best.base_days) : ANNUAL_VACATION_DAYS;
}

export function adjustmentDaysFor(adjustments: VacationAdjustment[], subject: VacationSubject, year: number): number {
  return adjustments
    .filter((a) => matchesSubject(a, subject) && a.year === year)
    .reduce((sum, a) => sum + Number(a.days), 0);
}

interface BalanceInputs {
  requests: BalanceRequest[];
  allowances: VacationAllowance[];
  adjustments: VacationAdjustment[];
  holidays: ReadonlySet<string>;
}

export function computeCarryover(inputs: BalanceInputs, subject: VacationSubject, priorYear: number): number {
  if (priorYear < POLICY_START_YEAR) return 0;
  const remainingAtYearEnd =
    baseDaysFor(inputs.allowances, subject, priorYear) +
    adjustmentDaysFor(inputs.adjustments, subject, priorYear) +
    computeCarryover(inputs, subject, priorYear - 1) -
    daysUsedInYear(inputs.requests, subject, priorYear, inputs.holidays);
  return Math.min(MAX_CARRYOVER_DAYS, Math.max(0, remainingAtYearEnd));
}

export function computeBalance(inputs: BalanceInputs, subject: VacationSubject, year: number): VacationBalance {
  // Narrow once so the per-year recursion doesn't rescan everyone's rows.
  const own: BalanceInputs = {
    requests: inputs.requests.filter((r) => matchesSubject(r, subject)),
    allowances: inputs.allowances.filter((a) => matchesSubject(a, subject)),
    adjustments: inputs.adjustments.filter((a) => matchesSubject(a, subject)),
    holidays: inputs.holidays,
  };
  const baseDays = baseDaysFor(own.allowances, subject, year);
  const adjustmentDays = adjustmentDaysFor(own.adjustments, subject, year);
  const carriedOverDays = computeCarryover(own, subject, year - 1);
  const usedDays = daysUsedInYear(own.requests, subject, year, own.holidays);
  return {
    year,
    baseDays,
    carriedOverDays,
    adjustmentDays,
    usedDays,
    otherLeaveDays: otherLeaveDaysInYear(own.requests, subject, year, own.holidays),
    remainingDays: baseDays + carriedOverDays + adjustmentDays - usedDays,
  };
}
