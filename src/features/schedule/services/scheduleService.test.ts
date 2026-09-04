import { describe, it, expect } from "vitest";
import { summarizeWorkerHours, findDoubleBookingConflicts } from "./scheduleService";
import type { ScheduleAssignee, ScheduleAssignmentDay, ScheduleProjectCard } from "../types";
import type { ScheduleApiClient, RawScheduleAssignment } from "../api/types";

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

function makeRawAssignment(overrides: Partial<RawScheduleAssignment>): RawScheduleAssignment {
  return {
    id: 1,
    project_id: 1,
    pm_id: null,
    sales_id: null,
    start_date: "2026-09-01",
    end_date: "2026-09-05",
    label: "",
    color: null,
    project: { id: 1, name: "Project A" },
    pm: null,
    sales: null,
    members: [],
    ...overrides,
  };
}

function fakeScheduleClient(assignments: RawScheduleAssignment[]): ScheduleApiClient {
  return {
    getAssignmentsForRange: async () => assignments,
    getAssignmentById: async (id) => assignments.find((a) => a.id === id) ?? null,
    getAssignmentDaysForAssignments: async () => [],
    createAssignment: async () => ({ id: 999 }),
    updateAssignment: async () => {},
    replaceAssignmentMembers: async () => {},
    deleteAssignment: async () => {},
    pruneAssignmentDaysOutsideRange: async () => {},
    upsertAssignmentDay: async () => {},
  };
}

describe("findDoubleBookingConflicts", () => {
  const workerMember = {
    profile_id: null,
    team_worker_id: 42,
    profile: null,
    team_worker: { id: 42, first_name: "Worker", last_name: "Forty-Two" },
  };

  it("flags a worker already on another overlapping assignment", async () => {
    const other = makeRawAssignment({ id: 2, start_date: "2026-09-03", end_date: "2026-09-10", members: [workerMember] });
    const client = fakeScheduleClient([other]);

    const conflicts = await findDoubleBookingConflicts(
      client,
      [{ profileId: null, teamWorkerId: 42 }],
      "2026-09-01",
      "2026-09-05",
      null,
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ assignmentId: 2, projectName: "Project A", assigneeName: "Worker Forty-Two" });
  });

  it("does not flag the assignment currently being edited", async () => {
    const self = makeRawAssignment({ id: 5, members: [workerMember] });
    const client = fakeScheduleClient([self]);

    const conflicts = await findDoubleBookingConflicts(client, [{ profileId: null, teamWorkerId: 42 }], "2026-09-01", "2026-09-05", 5);

    expect(conflicts).toHaveLength(0);
  });

  it("does not flag a different worker on the same overlapping assignment", async () => {
    const other = makeRawAssignment({ id: 2, members: [workerMember] });
    const client = fakeScheduleClient([other]);

    const conflicts = await findDoubleBookingConflicts(client, [{ profileId: null, teamWorkerId: 7 }], "2026-09-01", "2026-09-05", null);

    expect(conflicts).toHaveLength(0);
  });

  it("does not flag a non-overlapping assignment", async () => {
    const other = makeRawAssignment({ id: 2, start_date: "2026-10-01", end_date: "2026-10-05", members: [workerMember] });
    const client = fakeScheduleClient([other]);

    const conflicts = await findDoubleBookingConflicts(client, [{ profileId: null, teamWorkerId: 42 }], "2026-09-01", "2026-09-05", null);

    expect(conflicts).toHaveLength(0);
  });
});
