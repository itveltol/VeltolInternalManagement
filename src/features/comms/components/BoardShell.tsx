"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { getNotes, getNotifications } from "@/app/[locale]/(app)/board/actions";
import { ForMeBand } from "./ForMeBand";
import { BoardGrid } from "./BoardGrid";
import { NoteComposer } from "./NoteComposer";
import { NoteThread } from "./NoteThread";
import type { Note, Notification } from "../types";

interface Props {
  initialNotes: Note[];
  initialNotifications: Notification[];
  personalPinnedIds: number[];
  now: string;
  currentUserId: string;
  projectOptions: { id: number; name: string }[];
  teamOptions: { id: number; name: string }[];
  assigneeOptions: { id: string; name: string }[];
}

export function BoardShell({
  initialNotes,
  initialNotifications,
  personalPinnedIds,
  now,
  currentUserId,
  projectOptions,
  teamOptions,
  assigneeOptions,
}: Props) {
  const t = useTranslations("comms");
  const [notes, setNotes] = useState(initialNotes);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const [freshNotes, freshNotifications] = await Promise.all([getNotes({}), getNotifications()]);
      setNotes(freshNotes);
      setNotifications(freshNotifications);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  const pinnedNoteIds = new Set(personalPinnedIds);
  const openRoot = notes.find((n) => n.id === openNoteId) ?? null;

  return (
    <div className="space-y-6">
      <ForMeBand
        notes={notes}
        notifications={notifications}
        now={new Date(now)}
        currentUserId={currentUserId}
        onSelect={setOpenNoteId}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-[.06em] text-veltol-fgMute">
          {t("title")}
        </h2>
        <Button size="sm" onClick={() => setComposing((v) => !v)}>
          {composing ? t("backToList") : t("composer.publish")}
        </Button>
      </div>

      {composing && (
        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <NoteComposer
            projectOptions={projectOptions}
            teamOptions={teamOptions}
            assigneeOptions={assigneeOptions}
            onSuccess={() => {
              setComposing(false);
              reload();
            }}
            autoFocus
          />
        </div>
      )}

      {openRoot ? (
        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <Button variant="outline" size="sm" onClick={() => setOpenNoteId(null)}>
            {t("backToList")}
          </Button>
          <div className="mt-4">
            <NoteThread
              anchor={{ isPersonal: openRoot.is_personal, projectId: openRoot.project_id, activityId: openRoot.activity_id }}
              anchorLabel={openRoot.title ?? ""}
              rootId={openRoot.id}
              onChange={reload}
            />
          </div>
        </div>
      ) : (
        <BoardGrid notes={notes} pinnedNoteIds={pinnedNoteIds} onSelect={setOpenNoteId} />
      )}
    </div>
  );
}
