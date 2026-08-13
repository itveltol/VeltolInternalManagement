import { describe, it, expect } from "vitest";
import { buildDigest } from "./digest";
import type { Notification } from "../types";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    profile_id: "user-1",
    type: "mention",
    note_id: 1,
    project_id: null,
    payload: { snippet: "snippet" },
    href: "/board?note=1",
    read_at: null,
    created_at: "2026-08-13T08:00:00Z",
    ...overrides,
  };
}

describe("buildDigest", () => {
  it("returns a zero totalCount and no sections when there is nothing unread and nothing due", () => {
    const digest = buildDigest({ notifications: [], notesDueToday: [] });
    expect(digest.totalCount).toBe(0);
    expect(digest.sections).toEqual([]);
  });

  it("ignores already-read notifications", () => {
    const digest = buildDigest({
      notifications: [makeNotification({ read_at: "2026-08-13T09:00:00Z" })],
      notesDueToday: [],
    });
    expect(digest.totalCount).toBe(0);
  });

  it("groups ack_required, mention, and reply notifications into their own sections", () => {
    const digest = buildDigest({
      notifications: [
        makeNotification({ id: 1, type: "ack_required" }),
        makeNotification({ id: 2, type: "mention" }),
        makeNotification({ id: 3, type: "reply" }),
      ],
      notesDueToday: [],
    });
    const keys = digest.sections.map((s) => s.key);
    expect(keys).toEqual(["ackRequired", "mentions", "replies"]);
    expect(digest.totalCount).toBe(3);
  });

  it("puts due_soon and other system types into 'other', not their own section", () => {
    const digest = buildDigest({
      notifications: [makeNotification({ id: 1, type: "vacation_request" })],
      notesDueToday: [],
    });
    expect(digest.sections).toEqual([{ key: "other", items: [{ snippet: "snippet", href: "/board?note=1" }] }]);
  });

  it("excludes due_soon notifications from 'other' since notesDueToday covers that", () => {
    const digest = buildDigest({
      notifications: [makeNotification({ id: 1, type: "due_soon" })],
      notesDueToday: [],
    });
    expect(digest.sections).toEqual([]);
  });

  it("includes notes due today as their own section", () => {
    const digest = buildDigest({
      notifications: [],
      notesDueToday: [{ noteId: 5, title: "Follow up with client", snippet: "s", href: "/board?note=5" }],
    });
    expect(digest.sections).toEqual([
      { key: "dueToday", items: [{ snippet: "Follow up with client", href: "/board?note=5" }] },
    ]);
  });

  it("falls back to the snippet when a due-today note has no title", () => {
    const digest = buildDigest({
      notifications: [],
      notesDueToday: [{ noteId: 5, title: null, snippet: "body snippet", href: "/board?note=5" }],
    });
    expect(digest.sections[0].items[0].snippet).toBe("body snippet");
  });

  it("preserves section order: ackRequired, mentions, replies, dueToday, other", () => {
    const digest = buildDigest({
      notifications: [
        makeNotification({ id: 1, type: "system" }),
        makeNotification({ id: 2, type: "reply" }),
        makeNotification({ id: 3, type: "mention" }),
        makeNotification({ id: 4, type: "ack_required" }),
      ],
      notesDueToday: [{ noteId: 9, title: "Due", snippet: "s", href: "/x" }],
    });
    expect(digest.sections.map((s) => s.key)).toEqual(["ackRequired", "mentions", "replies", "dueToday", "other"]);
  });
});
