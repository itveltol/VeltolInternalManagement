import type { Note, NoteThread } from "../types";

export function assembleThreads(notes: Note[]): NoteThread[] {
  const roots: Note[] = [];
  const repliesByParent = new Map<number, Note[]>();

  for (const note of notes) {
    if (note.parent_id === null) {
      roots.push(note);
    } else {
      const list = repliesByParent.get(note.parent_id) ?? [];
      list.push(note);
      repliesByParent.set(note.parent_id, list);
    }
  }

  return roots
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((root) => ({
      root,
      replies: (repliesByParent.get(root.id) ?? []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }));
}

export function replyCountByRoot(notes: Note[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const note of notes) {
    if (note.parent_id !== null) {
      counts.set(note.parent_id, (counts.get(note.parent_id) ?? 0) + 1);
    }
  }
  return counts;
}

export function unreadCount(notifications: { read_at: string | null }[]): number {
  return notifications.filter((n) => n.read_at === null).length;
}

export type NotificationGroupLabel = "today" | "thisWeek" | "older";

export function groupNotificationsByAge<T extends { created_at: string }>(
  notifications: T[],
  now: Date,
): { label: NotificationGroupLabel; items: T[] }[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const today: T[] = [];
  const thisWeek: T[] = [];
  const older: T[] = [];

  for (const item of notifications) {
    const createdAt = new Date(item.created_at);
    if (createdAt >= startOfToday) {
      today.push(item);
    } else if (createdAt >= startOfWeek) {
      thisWeek.push(item);
    } else {
      older.push(item);
    }
  }

  const groups: { label: NotificationGroupLabel; items: T[] }[] = [
    { label: "today", items: today },
    { label: "thisWeek", items: thisWeek },
    { label: "older", items: older },
  ];
  return groups.filter((group) => group.items.length > 0);
}

export function isDueSoon(dueDate: string | null, now: Date): boolean {
  if (!dueDate) return false;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfter = new Date(startOfTomorrow);
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1);

  const due = new Date(dueDate);
  return due >= startOfToday && due < startOfDayAfter;
}

export function anchorLabel(
  note: Pick<Note, "project_id" | "project_name" | "activity_id" | "activity_name" | "is_personal">,
): { scope: "project" | "matrice" | "personal"; text: string | null } {
  if (note.activity_id !== null && note.project_id !== null) {
    return { scope: "matrice", text: note.activity_name };
  }
  if (note.project_id !== null) {
    return { scope: "project", text: note.project_name };
  }
  return { scope: "personal", text: null };
}
