import { describe, it, expect } from "vitest";
import { groupActivityEvents, mergeFeed, filterFeed } from "./activityFeed";
import type { ActivityEvent, Note } from "../types";

function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 1,
    actor_id: "user-1",
    actor: null,
    verb: "matrice.status_changed",
    project_id: 1,
    project_name: "Sannicolau 5MW",
    entity_table: "project_activity_status",
    entity_id: 10,
    summary: {},
    created_at: "2026-08-13T10:00:00.000Z",
    ...overrides,
  };
}

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
    created_at: "2026-08-13T10:00:00.000Z",
    updated_at: "2026-08-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("groupActivityEvents", () => {
  it("groups consecutive events by the same actor+project within 30 minutes", () => {
    const events = [
      makeEvent({ id: 3, created_at: "2026-08-13T10:20:00.000Z" }),
      makeEvent({ id: 2, created_at: "2026-08-13T10:10:00.000Z" }),
      makeEvent({ id: 1, created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const groups = groupActivityEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((e) => e.id)).toEqual([3, 2, 1]);
  });

  it("keeps a rolling window — a third event within 30min of the second joins even if >30min from the first", () => {
    const events = [
      makeEvent({ id: 3, created_at: "2026-08-13T10:50:00.000Z" }), // 30min after #2, 50min after #1
      makeEvent({ id: 2, created_at: "2026-08-13T10:25:00.000Z" }),
      makeEvent({ id: 1, created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const groups = groupActivityEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((e) => e.id)).toEqual([3, 2, 1]);
  });

  it("splits into separate groups once the gap exceeds 30 minutes", () => {
    const events = [
      makeEvent({ id: 2, created_at: "2026-08-13T11:00:00.000Z" }),
      makeEvent({ id: 1, created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const groups = groupActivityEvents(events);
    expect(groups).toHaveLength(2);
  });

  it("does not group events from different actors even within the window", () => {
    const events = [
      makeEvent({ id: 2, actor_id: "user-2", created_at: "2026-08-13T10:10:00.000Z" }),
      makeEvent({ id: 1, actor_id: "user-1", created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const groups = groupActivityEvents(events);
    expect(groups).toHaveLength(2);
  });

  it("does not group events from different projects even for the same actor", () => {
    const events = [
      makeEvent({ id: 2, project_id: 2, created_at: "2026-08-13T10:10:00.000Z" }),
      makeEvent({ id: 1, project_id: 1, created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const groups = groupActivityEvents(events);
    expect(groups).toHaveLength(2);
  });

  it("groups company-level events (project_id null) for the same actor", () => {
    const events = [
      makeEvent({ id: 2, project_id: null, verb: "vacation.approved", created_at: "2026-08-13T10:10:00.000Z" }),
      makeEvent({ id: 1, project_id: null, verb: "vacation.submitted", created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const groups = groupActivityEvents(events);
    expect(groups).toHaveLength(1);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupActivityEvents([])).toEqual([]);
  });

  it("handles a system actor (actor_id null) grouping with other null-actor events", () => {
    const events = [
      makeEvent({ id: 2, actor_id: null, created_at: "2026-08-13T10:10:00.000Z" }),
      makeEvent({ id: 1, actor_id: null, created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const groups = groupActivityEvents(events);
    expect(groups).toHaveLength(1);
    expect(groups[0].actorId).toBeNull();
  });
});

describe("mergeFeed", () => {
  it("merges events and notes into one chronological stream, newest first", () => {
    const events = [makeEvent({ id: 1, created_at: "2026-08-13T09:00:00.000Z" })];
    const notes = [makeNote({ id: 1, created_at: "2026-08-13T10:00:00.000Z" })];
    const merged = mergeFeed(events, notes);
    expect(merged).toHaveLength(2);
    expect(merged[0].kind).toBe("note");
    expect(merged[1].kind).toBe("event");
  });

  it("groups events before merging, so a merged stream never carries ungrouped duplicates", () => {
    const events = [
      makeEvent({ id: 2, created_at: "2026-08-13T10:05:00.000Z" }),
      makeEvent({ id: 1, created_at: "2026-08-13T10:00:00.000Z" }),
    ];
    const merged = mergeFeed(events, []);
    expect(merged).toHaveLength(1);
  });
});

describe("filterFeed", () => {
  const items = mergeFeed(
    [makeEvent({ id: 1, created_at: "2026-08-13T09:00:00.000Z" })],
    [makeNote({ id: 1, created_at: "2026-08-13T10:00:00.000Z" })],
  );

  it("'all' returns everything", () => {
    expect(filterFeed(items, "all")).toHaveLength(2);
  });

  it("'people' returns only notes", () => {
    const filtered = filterFeed(items, "people");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].kind).toBe("note");
  });

  it("'system' returns only events", () => {
    const filtered = filterFeed(items, "system");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].kind).toBe("event");
  });
});
