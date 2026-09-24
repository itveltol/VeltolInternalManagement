import { describe, expect, it } from "vitest";
import { baseDaysFor, computeBalance } from "./vacationBalanceService";
import type { VacationAdjustment, VacationAllowance, VacationLeaveType, VacationSubject } from "../types";

const alice: VacationSubject = { kind: "user", id: "alice" };
const bob: VacationSubject = { kind: "team_worker", id: 7 };

function req(
  subject: VacationSubject,
  start: string,
  end: string,
  leave_type: VacationLeaveType = "rest",
  status: "approved" | "pending" = "approved",
) {
  return {
    user_id: subject.kind === "user" ? subject.id : null,
    team_worker_id: subject.kind === "team_worker" ? subject.id : null,
    start_date: start,
    end_date: end,
    status,
    leave_type,
  };
}

function allowance(subject: VacationSubject, year: number, base_days: number): VacationAllowance {
  return {
    id: year,
    user_id: subject.kind === "user" ? subject.id : null,
    team_worker_id: subject.kind === "team_worker" ? subject.id : null,
    year,
    base_days,
  };
}

function adjustment(subject: VacationSubject, year: number, days: number): VacationAdjustment {
  return {
    id: days,
    user_id: subject.kind === "user" ? subject.id : null,
    team_worker_id: subject.kind === "team_worker" ? subject.id : null,
    year,
    days,
    note: "x",
    created_by: null,
    created_at: "",
  };
}

const none = { requests: [], allowances: [], adjustments: [], holidays: new Set<string>() };

describe("baseDaysFor", () => {
  it("falls back to the company default", () => {
    expect(baseDaysFor([], alice, 2026)).toBe(21);
  });

  it("inherits the latest earlier year and ignores later years", () => {
    const rows = [allowance(alice, 2026, 23), allowance(alice, 2028, 25)];
    expect(baseDaysFor(rows, alice, 2027)).toBe(23);
    expect(baseDaysFor(rows, alice, 2029)).toBe(25);
    expect(baseDaysFor(rows, alice, 2025)).toBe(21);
  });

  it("does not leak across subjects", () => {
    expect(baseDaysFor([allowance(alice, 2026, 30)], bob, 2026)).toBe(21);
  });
});

describe("computeBalance", () => {
  it("deducts only rest leave and reports other leave separately", () => {
    // 2026-03-02 is a Monday → Mon–Fri = 5 working days each.
    const b = computeBalance(
      {
        ...none,
        requests: [
          req(alice, "2026-03-02", "2026-03-06"),
          req(alice, "2026-04-06", "2026-04-10", "medical"),
          req(alice, "2026-05-04", "2026-05-08", "rest", "pending"),
        ],
      },
      alice,
      2026,
    );
    expect(b).toMatchObject({ baseDays: 21, usedDays: 5, otherLeaveDays: 5, remainingDays: 16 });
  });

  it("applies per-year allowance and adjustments", () => {
    const b = computeBalance(
      { ...none, allowances: [allowance(alice, 2026, 25)], adjustments: [adjustment(alice, 2026, 2)] },
      alice,
      2026,
    );
    expect(b).toMatchObject({ baseDays: 25, adjustmentDays: 2, remainingDays: 27 });
  });

  it("carries over at most 5 days, including prior-year allowance and adjustments", () => {
    const b = computeBalance(
      {
        ...none,
        allowances: [allowance(alice, 2026, 10), allowance(alice, 2027, 21)],
        adjustments: [adjustment(alice, 2026, -8)],
      },
      alice,
      2027,
    );
    // 2026: 10 - 8 = 2 unused → carry 2.
    expect(b).toMatchObject({ carriedOverDays: 2, remainingDays: 23 });
  });

  it("works for team workers", () => {
    const b = computeBalance({ ...none, requests: [req(bob, "2026-03-02", "2026-03-03")] }, bob, 2026);
    expect(b.usedDays).toBe(2);
  });
});
