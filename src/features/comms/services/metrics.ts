import type { CommsMetric } from "../types";

// Ack rate is a ratio, not a plain count — its "value" needs a denominator
// to mean anything, so it's computed here rather than carried as a single
// number from SQL. Returns null when there is no denominator (no
// ack-required notes in that period) rather than fabricating a 0% or 100%.
export function ackRatePct(acknowledgedWithin24h: number, totalReceipts: number): number | null {
  if (totalReceipts === 0) return null;
  return Math.round((acknowledgedWithin24h / totalReceipts) * 100);
}

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export interface Trend {
  direction: TrendDirection;
  // Percentage-point (for ackRate) or absolute delta vs. the previous
  // period. Null when either side of the comparison is unavailable — the
  // caller must render "—", never a fabricated number.
  delta: number | null;
}

// Never invents a delta: both the current and previous value must be
// present (not null) to produce a real trend. A metric whose previous
// period had no denominator (e.g. ackRate with zero receipts) yields
// "unknown", by construction, not a divide-by-zero or a guessed 0.
export function computeTrend(metric: CommsMetric): Trend {
  if (metric.value === null || metric.previousValue === null) {
    return { direction: "unknown", delta: null };
  }
  const delta = metric.value - metric.previousValue;
  if (delta === 0) return { direction: "flat", delta: 0 };
  return { direction: delta > 0 ? "up" : "down", delta };
}
