"use client";

import { useTranslations } from "next-intl";
import { anchorLabel, isDueSoon } from "../services/notes";
import type { Note, Notification } from "../types";

interface Props {
  notes: Note[];
  notifications: Notification[];
  now: Date;
  onSelect: (noteId: number) => void;
}

export function ForMeBand({ notes, notifications, now, onSelect }: Props) {
  const t = useTranslations("comms");

  const unreadMentionNoteIds = new Set(
    notifications.filter((n) => n.type === "mention" && n.read_at === null && n.note_id !== null).map((n) => n.note_id as number),
  );

  const dueSoon = notes.filter((n) => isDueSoon(n.due_date, now));
  const openQuestionsForMe = notes.filter(
    (n) => n.kind === "question" && n.status === "open" && unreadMentionNoteIds.has(n.id),
  );
  const mentioned = notes.filter((n) => unreadMentionNoteIds.has(n.id));

  const items = Array.from(new Map([...mentioned, ...dueSoon, ...openQuestionsForMe].map((n) => [n.id, n])).values());

  return (
    <div className="rounded-card border border-border bg-card p-4 shadow-card">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[.06em] text-veltol-fgMute">
        {t("forMe.title")}
      </h2>
      {items.length === 0 ? (
        <p className="text-[13px] text-veltol-fgMute">{t("forMe.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const anchor = anchorLabel(n);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelect(n.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left text-[13px] text-veltol-fg transition-colors hover:bg-veltol-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1 truncate">{n.title ?? n.body}</span>
                <span className="shrink-0 text-[11px] text-veltol-fgMute">
                  {anchor.scope === "personal" ? t("anchorPersonal") : anchor.text}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
