import { describe, it, expect } from "vitest";
import { ackRatePct, computeTrend } from "./metrics";

describe("ackRatePct", () => {
  it("computes a rounded percentage", () => {
    expect(ackRatePct(4, 5)).toBe(80);
    expect(ackRatePct(1, 3)).toBe(33);
  });

  it("returns null when there is no denominator, instead of dividing by zero", () => {
    expect(ackRatePct(0, 0)).toBeNull();
  });

  it("returns 0 when nobody acknowledged but the denominator is non-zero", () => {
    expect(ackRatePct(0, 5)).toBe(0);
  });

  it("returns 100 when everybody acknowledged in time", () => {
    expect(ackRatePct(5, 5)).toBe(100);
  });
});

describe("computeTrend", () => {
  it("reports 'up' with a positive delta when the value increased", () => {
    expect(computeTrend({ value: 10, previousValue: 4 })).toEqual({ direction: "up", delta: 6 });
  });

  it("reports 'down' with a negative delta when the value decreased", () => {
    expect(computeTrend({ value: 3, previousValue: 8 })).toEqual({ direction: "down", delta: -5 });
  });

  it("reports 'flat' when nothing changed", () => {
    expect(computeTrend({ value: 5, previousValue: 5 })).toEqual({ direction: "flat", delta: 0 });
  });

  it("reports 'unknown' with a null delta when the current value is unavailable", () => {
    expect(computeTrend({ value: null, previousValue: 5 })).toEqual({ direction: "unknown", delta: null });
  });

  it("reports 'unknown' with a null delta when the previous value is unavailable — never fabricates a baseline", () => {
    expect(computeTrend({ value: 5, previousValue: null })).toEqual({ direction: "unknown", delta: null });
  });

  it("reports 'unknown' when both are unavailable", () => {
    expect(computeTrend({ value: null, previousValue: null })).toEqual({ direction: "unknown", delta: null });
  });
});
