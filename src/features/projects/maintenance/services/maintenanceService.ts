import type { MaintenanceCheck, MaintenanceCycle, MaintenancePeriod, MaintenanceState } from "../types";
import { MAINTENANCE_PERIODS } from "../types";

const INSPECTION_MONTH: Record<MaintenancePeriod, number> = {
  // 0-indexed months: March = 2, October = 9
  march: 2,
  october: 7,
};

/**
 * Reminder window: 1 calendar month before the inspection month, through the
 * end of the inspection month itself (e.g. March -> Feb 1 - Mar 31).
 */
export function getReminderWindow(period: MaintenancePeriod, year: number): { start: Date; end: Date } {
  const month = INSPECTION_MONTH[period];
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export function isReminderActive(period: MaintenancePeriod, year: number, today: Date): boolean {
  const { start, end } = getReminderWindow(period, year);
  return today >= start && today <= end;
}

export function needsAttention(check: { checked: boolean } | null, period: MaintenancePeriod, year: number, today: Date): boolean {
  if (check?.checked) return false;
  return isReminderActive(period, year, today);
}

export function getMaintenanceState(check: MaintenanceCheck | null, period: MaintenancePeriod, year: number, today: Date): MaintenanceState {
  if (check?.checked) return "done";
  return isReminderActive(period, year, today) ? "needsAttention" : "notDue";
}

/** This year's two inspection cycles, merged with whatever DB records exist. */
export function buildMaintenanceCycles(checks: MaintenanceCheck[], today: Date): MaintenanceCycle[] {
  const year = today.getUTCFullYear();
  return MAINTENANCE_PERIODS.map((period) => {
    const check = checks.find((c) => c.year === year && c.period === period) ?? null;
    return {
      year,
      period,
      check,
      state: getMaintenanceState(check, period, year, today),
    };
  });
}
