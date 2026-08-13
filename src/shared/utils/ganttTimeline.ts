import { formatDate } from "./formatDate";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function toDayMs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

export function addDays(dateStr: string, days: number): string {
  const ms = toDayMs(dateStr) + days * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

export interface WeekSection {
  label: string;
  leftPct: number;
  widthPct: number;
}

export interface MonthMarker {
  label: string;
  leftPct: number;
  widthPct: number;
  weeks: WeekSection[];
}

const WEEK_BOUNDARIES = [1, 8, 15, 22];

/**
 * Splits a calendar range into month markers, each divided into 4 fixed
 * day-of-month sections (1-7, 8-14, 15-21, 22-end). A fixed 4-way split is
 * used instead of real ISO weeks because months don't divide evenly into
 * calendar weeks — this keeps "every month has exactly 4 sections" true.
 */
export function buildMonthWeekMarkers(rangeStart: number, rangeEnd: number, totalSpan: number): MonthMarker[] {
  const markers: MonthMarker[] = [];
  const rangeStartDate = new Date(rangeStart);
  const cursor = new Date(rangeStartDate.getFullYear(), rangeStartDate.getMonth(), 1);

  while (cursor.getTime() < rangeEnd) {
    const monthStart = cursor.getTime();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthEnd = new Date(year, month + 1, 1).getTime();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const visibleStart = Math.max(monthStart, rangeStart);
    const visibleEnd = Math.min(monthEnd, rangeEnd);

    if (visibleEnd > visibleStart) {
      const weeks: WeekSection[] = WEEK_BOUNDARIES.map((startDay, i) => {
        const endDay = i + 1 < WEEK_BOUNDARIES.length ? WEEK_BOUNDARIES[i + 1] : daysInMonth + 1;
        const sectionStart = new Date(year, month, startDay).getTime();
        const sectionEnd = new Date(year, month, Math.min(endDay, daysInMonth + 1)).getTime();
        const clippedStart = Math.max(sectionStart, rangeStart);
        const clippedEnd = Math.min(sectionEnd, rangeEnd);
        const lastDay = Math.min(endDay - 1, daysInMonth);
        return {
          label: `${startDay}–${lastDay}`,
          leftPct: ((clippedStart - rangeStart) / totalSpan) * 100,
          widthPct: Math.max(0, ((clippedEnd - clippedStart) / totalSpan) * 100),
        };
      }).filter((w) => w.widthPct > 0);

      markers.push({
        label: formatDate(cursor, { month: "long", year: undefined, day: undefined }),
        leftPct: ((visibleStart - rangeStart) / totalSpan) * 100,
        widthPct: ((visibleEnd - visibleStart) / totalSpan) * 100,
        weeks,
      });
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return markers;
}
