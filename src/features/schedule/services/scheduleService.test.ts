import { describe, it, expect } from "vitest";
import { summarizeWorkerHours } from "./scheduleService";
import type { ScheduleAssignee, ScheduleAssignmentDay, ScheduleProjectCard } from "../types";

const alice: ScheduleAssignee = { id: "alice", name: "Alice", kind: "profile" };
const bob: ScheduleAssignee = { id: "bob", name: "Bob", kind: "profile" };

function makeDay(overrides: Partial<ScheduleAssignmentDay> & Pick<ScheduleAssignmentDay, "work_date">): ScheduleAssignmentDay {
  return {
    delegated: false,
    plus_hours: 0,
    assignees: [{ assignee: alice, onVacation: false }],
    ...overrides,
  };
}

function makeCard(days: ScheduleAssignmentDay[]): ScheduleProjectCard {
  return {
    project_id: 1,
    project_name: "Test project",
    assignments: [
      {
        id: 1,
        project_id: 1,
        pm: null,
        sales: null,
        assignees: [alice],
        start_date: days[0]?.work_date ?? "2026-09-01",
        end_date: days[days.length - 1]?.work_date ?? "2026-09-01",
        label: "",
        color: null,
        days,
      },
    ],
  };
}

describe("summarizeWorkerHours", () => {
  it("counts a normal day as 8 base hours", () => {
    const cards = [makeCard([makeDay({ work_date: "2026-09-01" })])];
    const [summary] = summarizeWorkerHours(cards);
    expect(summary).toMatchObject({ normalDays: 1, delegationDays: 0, baseHours: 8, plusHours: 0, totalHours: 8 });
  });

  it("counts a delegation day as 12 base hours plus its plus_hours", () => {
    const cards = [makeCard([makeDay({ work_date: "2026-09-01", delegated: true, plus_hours: 2 })])];
    const [summary] = summarizeWorkerHours(cards);
    expect(summary).toMatchObject({ normalDays: 0, delegationDays: 1, baseHours: 12, plusHours: 2, totalHours: 14 });
  });

  it("excludes a day the person is on approved vacation for", () => {
    const cards = [
      makeCard([makeDay({ work_date: "2026-09-01", assignees: [{ assignee: alice, onVacation: true }] })]),
    ];
    const summary = summarizeWorkerHours(cards);
    expect(summary).toHaveLength(0);
  });

  it("counts a day once (not per-card) when two overlapping cards cover the same person and date, using delegation if any card is delegated", () => {
    const day1 = makeDay({ work_date: "2026-09-01", delegated: true, plus_hours: 1 });
    const day2 = makeDay({ work_date: "2026-09-01", delegated: false, plus_hours: 1 });
    const cards = [makeCard([day1]), makeCard([day2])];
    const [summary] = summarizeWorkerHours(cards);
    expect(summary).toMatchObject({ normalDays: 0, delegationDays: 1, baseHours: 12, plusHours: 2, totalHours: 14 });
  });

  it("aggregates multiple people independently and sorts by name", () => {
    const cards = [
      makeCard([makeDay({ work_date: "2026-09-01" })]),
      {
        ...makeCard([makeDay({ work_date: "2026-09-01", delegated: true, assignees: [{ assignee: bob, onVacation: false }] })]),
      },
    ];
    const summaries = summarizeWorkerHours(cards);
    expect(summaries.map((s) => s.assignee.name)).toEqual(["Alice", "Bob"]);
    expect(summaries[1]).toMatchObject({ delegationDays: 1, baseHours: 12 });
  });
});
