"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/shared/components/ui/select";
import { NoteCard } from "./NoteCard";
import { groupNotesByStatus } from "../services/notes";
import type { Note } from "../types";

interface Props {
  notes: Note[];
  pinnedNoteIds: Set<number>;
  onSelect: (noteId: number) => void;
}

function sortByPinThenDate(notes: Note[], pinnedNoteIds: Set<number>): Note[] {
  return [...notes].sort((a, b) => {
    const aPinned = pinnedNoteIds.has(a.id) ? 0 : 1;
    const bPinned = pinnedNoteIds.has(b.id) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function BoardGrid({ notes, pinnedNoteIds, onSelect }: Props) {
  const t = useTranslations("comms");
  const [kindFilter, setKindFilter] = useState<string>("all");

  // Announcements have their own dedicated section — the board only shows
  // tasks/questions/decisions.
  const roots = useMemo(
    () => notes.filter((n) => n.parent_id === null && n.kind !== "announcement"),
    [notes],
  );

  const filtered = useMemo(() => {
    if (kindFilter === "all") return roots;
    return roots.filter((n) => n.kind === kindFilter);
  }, [roots, kindFilter]);

  const sections = useMemo(() => {
    const { open, resolved } = groupNotesByStatus(filtered);
    return {
      open: sortByPinThenDate(open, pinnedNoteIds),
      resolved: sortByPinThenDate(resolved, pinnedNoteIds),
    };
  }, [filtered, pinnedNoteIds]);

  const isEmpty = sections.open.length === 0 && sections.resolved.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="w-auto">
          <option value="all">{t("filters.allKinds")}</option>
          <option value="task">{t("kind.task")}</option>
          <option value="question">{t("kind.question")}</option>
          <option value="decision">{t("kind.decision")}</option>
        </Select>
      </div>

      {isEmpty ? (
        <p className="text-[13px] text-veltol-fgMute">{t("emptyThread")}</p>
      ) : (
        <>
          {sections.open.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[.1em] text-veltol-fgMute">
                {t("sections.inProgress")} ({sections.open.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sections.open.map((note) => (
                  <NoteCard key={note.id} note={note} onClick={() => onSelect(note.id)} />
                ))}
              </div>
            </div>
          )}

          {sections.resolved.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[.1em] text-veltol-fgMute">
                {t("sections.resolved")} ({sections.resolved.length})
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sections.resolved.map((note) => (
                  <NoteCard key={note.id} note={note} onClick={() => onSelect(note.id)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
