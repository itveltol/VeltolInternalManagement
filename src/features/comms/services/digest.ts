import type { Notification } from "../types";

export interface DigestNoteDueToday {
  noteId: number;
  title: string | null;
  snippet: string;
  href: string;
}

export interface DigestInput {
  notifications: Notification[];
  notesDueToday: DigestNoteDueToday[];
}

export interface DigestSection {
  key: "ackRequired" | "mentions" | "replies" | "dueToday" | "other";
  items: { snippet: string; href: string | null }[];
}

export interface Digest {
  sections: DigestSection[];
  totalCount: number;
}

/**
 * Groups a user's unread notifications (plus notes due today) into digest
 * sections. Returns totalCount = 0 when there's nothing to report, so the
 * caller can skip sending — an empty digest is the fastest way to train
 * people to filter the sender.
 */
export function buildDigest(input: DigestInput): Digest {
  const unread = input.notifications.filter((n) => n.read_at === null);

  const ackRequired = unread.filter((n) => n.type === "ack_required");
  const mentions = unread.filter((n) => n.type === "mention");
  const replies = unread.filter((n) => n.type === "reply");
  const other = unread.filter((n) => !["ack_required", "mention", "reply", "due_soon"].includes(n.type));

  const sections: DigestSection[] = (
    [
      { key: "ackRequired", items: ackRequired.map(toItem) },
      { key: "mentions", items: mentions.map(toItem) },
      { key: "replies", items: replies.map(toItem) },
      {
        key: "dueToday",
        items: input.notesDueToday.map((n) => ({ snippet: n.title ?? n.snippet, href: n.href })),
      },
      { key: "other", items: other.map(toItem) },
    ] satisfies DigestSection[]
  ).filter((section) => section.items.length > 0);

  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);

  return { sections, totalCount };
}

function toItem(n: Notification): { snippet: string; href: string | null } {
  return { snippet: n.payload.snippet ?? "", href: n.href };
}
