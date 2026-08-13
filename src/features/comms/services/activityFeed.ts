import type { ActivityEvent, ActivityEventGroup, FeedItem, Note } from "../types";

const GROUP_WINDOW_MS = 30 * 60 * 1000;

// Collapses consecutive events by the same actor on the same project within
// a 30-minute window into one grouped row ("Ana a actualizat 7 activități").
// Input must already be sorted newest-first; grouping only looks at
// adjacent events, never re-sorts, so an out-of-order input silently
// produces wrong groups rather than throwing — callers own the sort order.
export function groupActivityEvents(events: ActivityEvent[]): ActivityEventGroup[] {
  const groups: ActivityEventGroup[] = [];
  // Tracks the timestamp of the last event appended to the current group —
  // separate from the group's displayed createdAt (its most recent event) —
  // because input is newest-first: the rolling window must compare against
  // whichever event was processed last (the earliest-so-far), not the max,
  // so a chain of events each 25 minutes apart keeps joining even though the
  // first and last are 50+ minutes apart.
  let lastProcessedAt: number | null = null;

  for (const event of events) {
    const current = groups[groups.length - 1];
    const eventMs = new Date(event.created_at).getTime();
    const withinWindow =
      current !== undefined &&
      current.actorId === event.actor_id &&
      current.projectId === event.project_id &&
      lastProcessedAt !== null &&
      Math.abs(lastProcessedAt - eventMs) <= GROUP_WINDOW_MS;

    if (withinWindow) {
      current.events.push(event);
      if (eventMs > new Date(current.createdAt).getTime()) {
        current.createdAt = event.created_at;
      }
      lastProcessedAt = eventMs;
      continue;
    }

    groups.push({
      kind: "event",
      actorId: event.actor_id,
      projectId: event.project_id,
      events: [event],
      createdAt: event.created_at,
    });
    lastProcessedAt = eventMs;
  }

  return groups;
}

// Merges activity_events (as grouped rows) and notes (as individual rows)
// into one chronological stream, newest first. Notes are never grouped —
// human content stays full-weight and individually clickable.
export function mergeFeed(events: ActivityEvent[], notes: Note[]): FeedItem[] {
  const eventGroups = groupActivityEvents(events);
  const items: FeedItem[] = [
    ...eventGroups,
    ...notes.map((note): FeedItem => ({ kind: "note", note })),
  ];
  return items.sort((a, b) => new Date(feedItemTimestamp(b)).getTime() - new Date(feedItemTimestamp(a)).getTime());
}

export function feedItemTimestamp(item: FeedItem): string {
  return item.kind === "event" ? item.createdAt : item.note.created_at;
}

export type FeedFilter = "all" | "people" | "system";

export function filterFeed(items: FeedItem[], filter: FeedFilter): FeedItem[] {
  if (filter === "all") return items;
  if (filter === "people") return items.filter((item) => item.kind === "note");
  return items.filter((item) => item.kind === "event");
}
