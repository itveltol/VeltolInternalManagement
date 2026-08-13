"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/shared/components/ui/select";
import { NoteCard } from "./NoteCard";
import type { Note } from "../types";

interface Props {
  notes: Note[];
  pinnedNoteIds: Set<number>;
  onSelect: (noteId: number) => void;
}

export function BoardGrid({ notes, pinnedNoteIds, onSelect }: Props) {
  const t = useTranslations("comms");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  const roots = useMemo(() => notes.filter((n) => n.parent_id === null), [notes]);

  const filtered = useMemo(() => {
    return roots.filter((n) => {
      if (kindFilter !== "all" && n.kind !== kindFilter) return false;
      if (unreadOnly && !n.unread) return false;
      if (openOnly && n.status !== "open") return false;
      return true;
    });
  }, [roots, kindFilter, unreadOnly, openOnly]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedNoteIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedNoteIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered, pinnedNoteIds]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="w-auto">
          <option value="all">{t("filters.allKinds")}</option>
          <option value="note">{t("kind.note")}</option>
          <option value="question">{t("kind.question")}</option>
          <option value="decision">{t("kind.decision")}</option>
          <option value="risk">{t("kind.risk")}</option>
          <option value="announcement">{t("kind.announcement")}</option>
        </Select>
        <label className="flex items-center gap-1.5 text-[13px] text-veltol-fgDim">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          {t("filters.unreadOnly")}
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-veltol-fgDim">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          {t("filters.openOnly")}
        </label>
      </div>

      {sorted.length === 0 ? (
        <p className="text-[13px] text-veltol-fgMute">{t("emptyThread")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((note) => (
            <NoteCard key={note.id} note={note} onClick={() => onSelect(note.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
