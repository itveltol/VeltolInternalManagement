import { describe, it, expect } from "vitest";
import {
  assembleThreads,
  replyCountByRoot,
  unreadCount,
  groupNotificationsByAge,
  isDueSoon,
  anchorLabel,
  summarizeAcks,
  canSendReminder,
} from "./notes";
import type { AckReceipt, Note } from "../types";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 1,
    kind: "note",
    title: null,
    body: "body",
    color: null,
    author_id: "user-1",
    author: null,
    visibility: "project",
    status: "open",
    parent_id: null,
    due_date: null,
    requires_ack: false,
    ack_deadline: null,
    is_personal: false,
    project_id: 1,
    project_name: "Sannicolau 5MW",
    activity_id: null,
    activity_name: null,
    situation_id: null,
    client_id: null,
    subcontractor_id: null,
    supplier_id: null,
    document_id: null,
    team_id: null,
    reply_count: 0,
    unread: false,
    last_reminder_at: null,
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("assembleThreads", () => {
  it("groups replies under their root and sorts replies oldest-first", () => {
    const root = makeNote({ id: 1, created_at: "2026-08-01T10:00:00Z" });
    const replyLate = makeNote({ id: 2, parent_id: 1, created_at: "2026-08-01T12:00:00Z" });
    const replyEarly = makeNote({ id: 3, parent_id: 1, created_at: "2026-08-01T11:00:00Z" });

    const threads = assembleThreads([root, replyLate, replyEarly]);

    expect(threads).toHaveLength(1);
    expect(threads[0].root.id).toBe(1);
    expect(threads[0].replies.map((r) => r.id)).toEqual([3, 2]);
  });

  it("sorts multiple roots newest-first", () => {
    const older = makeNote({ id: 1, created_at: "2026-08-01T10:00:00Z" });
    const newer = makeNote({ id: 2, created_at: "2026-08-02T10:00:00Z" });

    const threads = assembleThreads([older, newer]);

    expect(threads.map((t) => t.root.id)).toEqual([2, 1]);
  });

  it("gives a root with no replies an empty replies array", () => {
    const root = makeNote({ id: 1 });
    const threads = assembleThreads([root]);
    expect(threads[0].replies).toEqual([]);
  });
});

describe("replyCountByRoot", () => {
  it("counts replies per parent, ignoring root notes", () => {
    const notes = [
      makeNote({ id: 1 }),
      makeNote({ id: 2, parent_id: 1 }),
      makeNote({ id: 3, parent_id: 1 }),
      makeNote({ id: 4, parent_id: 5 }),
    ];
    const counts = replyCountByRoot(notes);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(5)).toBe(1);
    expect(counts.has(2)).toBe(false);
  });
});

describe("unreadCount", () => {
  it("counts only notifications with a null read_at", () => {
    expect(unreadCount([{ read_at: null }, { read_at: "2026-08-01T00:00:00Z" }, { read_at: null }])).toBe(2);
  });

  it("returns 0 when every notification has been read", () => {
    expect(unreadCount([{ read_at: "2026-08-01T00:00:00Z" }])).toBe(0);
  });
});

describe("groupNotificationsByAge", () => {
  const now = new Date("2026-08-12T15:00:00Z");

  it("buckets an item from today into 'today'", () => {
    const groups = groupNotificationsByAge([{ created_at: "2026-08-12T08:00:00Z" }], now);
    expect(groups).toEqual([{ label: "today", items: [{ created_at: "2026-08-12T08:00:00Z" }] }]);
  });

  it("buckets an item from three days ago into 'thisWeek'", () => {
    const groups = groupNotificationsByAge([{ created_at: "2026-08-09T08:00:00Z" }], now);
    expect(groups).toEqual([{ label: "thisWeek", items: [{ created_at: "2026-08-09T08:00:00Z" }] }]);
  });

  it("buckets an item from three weeks ago into 'older'", () => {
    const groups = groupNotificationsByAge([{ created_at: "2026-07-20T08:00:00Z" }], now);
    expect(groups).toEqual([{ label: "older", items: [{ created_at: "2026-07-20T08:00:00Z" }] }]);
  });

  it("omits empty groups entirely", () => {
    const groups = groupNotificationsByAge([{ created_at: "2026-08-12T08:00:00Z" }], now);
    expect(groups.map((g) => g.label)).toEqual(["today"]);
  });
});

describe("isDueSoon", () => {
  const now = new Date("2026-08-12T15:00:00Z");

  it("is true for a due_date of today", () => {
    expect(isDueSoon("2026-08-12", now)).toBe(true);
  });

  it("is true for a due_date of tomorrow", () => {
    expect(isDueSoon("2026-08-13", now)).toBe(true);
  });

  it("is false for a due_date further out", () => {
    expect(isDueSoon("2026-08-14", now)).toBe(false);
  });

  it("is false for a past due_date", () => {
    expect(isDueSoon("2026-08-11", now)).toBe(false);
  });

  it("is false when there is no due_date", () => {
    expect(isDueSoon(null, now)).toBe(false);
  });
});

describe("anchorLabel", () => {
  it("labels a matrice-anchored note with its project and activity name", () => {
    const note = makeNote({ project_id: 1, project_name: "P1", activity_id: 5, activity_name: "Aviz ANRE" });
    expect(anchorLabel(note)).toEqual({ scope: "matrice", text: "P1 · Aviz ANRE" });
  });

  it("falls back to just the activity name when the project name is missing", () => {
    const note = makeNote({ project_id: 1, project_name: null, activity_id: 5, activity_name: "Aviz ANRE" });
    expect(anchorLabel(note)).toEqual({ scope: "matrice", text: "Aviz ANRE" });
  });

  it("labels a project-anchored note with its project name", () => {
    const note = makeNote({ project_id: 1, project_name: "P1", activity_id: null });
    expect(anchorLabel(note)).toEqual({ scope: "project", text: "P1" });
  });

  it("labels a personal note with no anchor text", () => {
    const note = makeNote({ project_id: null, activity_id: null, is_personal: true });
    expect(anchorLabel(note)).toEqual({ scope: "personal", text: null });
  });
});

function makeReceipt(overrides: Partial<AckReceipt> = {}): AckReceipt {
  return {
    profile_id: "user-1",
    name: "Ana Pop",
    seen_at: null,
    acknowledged_at: null,
    ...overrides,
  };
}

describe("summarizeAcks", () => {
  it("splits receipts into confirmed and unconfirmed", () => {
    const receipts = [
      makeReceipt({ profile_id: "a", acknowledged_at: "2026-08-12T10:00:00Z" }),
      makeReceipt({ profile_id: "b", acknowledged_at: null }),
    ];
    const summary = summarizeAcks(receipts);
    expect(summary.total).toBe(2);
    expect(summary.acknowledged).toBe(1);
    expect(summary.confirmed.map((r) => r.profile_id)).toEqual(["a"]);
    expect(summary.unconfirmed.map((r) => r.profile_id)).toEqual(["b"]);
  });

  it("sorts confirmed by acknowledged_at ascending", () => {
    const receipts = [
      makeReceipt({ profile_id: "a", name: "B", acknowledged_at: "2026-08-12T12:00:00Z" }),
      makeReceipt({ profile_id: "b", name: "A", acknowledged_at: "2026-08-12T09:00:00Z" }),
    ];
    const summary = summarizeAcks(receipts);
    expect(summary.confirmed.map((r) => r.profile_id)).toEqual(["b", "a"]);
  });

  it("sorts unconfirmed alphabetically by name", () => {
    const receipts = [makeReceipt({ profile_id: "a", name: "Zsofia" }), makeReceipt({ profile_id: "b", name: "Ana" })];
    const summary = summarizeAcks(receipts);
    expect(summary.unconfirmed.map((r) => r.profile_id)).toEqual(["b", "a"]);
  });

  it("returns an empty summary for no receipts", () => {
    const summary = summarizeAcks([]);
    expect(summary).toEqual({ total: 0, acknowledged: 0, confirmed: [], unconfirmed: [] });
  });
});

describe("canSendReminder", () => {
  const now = new Date("2026-08-13T12:00:00Z");

  it("allows sending when no reminder has ever been sent", () => {
    expect(canSendReminder(null, now)).toBe(true);
  });

  it("blocks sending within 24h of the last reminder", () => {
    expect(canSendReminder("2026-08-13T00:00:01Z", now)).toBe(false);
  });

  it("allows sending exactly 24h after the last reminder", () => {
    expect(canSendReminder("2026-08-12T12:00:00Z", now)).toBe(true);
  });

  it("allows sending well after the 24h window", () => {
    expect(canSendReminder("2026-08-01T12:00:00Z", now)).toBe(true);
  });
});
