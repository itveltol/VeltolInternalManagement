"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getNotes, getNoteThread, setNoteStatusAction } from "@/app/[locale]/(app)/board/actions";
import { assembleThreads } from "../services/notes";
import { NoteCard } from "./NoteCard";
import { NoteComposer } from "./NoteComposer";
import type { Note, NoteAnchor } from "../types";

interface Props {
  anchor: NoteAnchor;
  anchorLabel: string;
  /** When set, only this root's thread is shown (used by a "discussion" popover); otherwise every root matching the anchor is listed. */
  rootId?: number;
  /** Notifies a parent list (e.g. BoardShell's own notes state) that a note changed, so it can refetch too. */
  onChange?: () => void;
}

export function NoteThread({ anchor, anchorLabel: anchorLabelText, rootId, onChange }: Props) {
  const t = useTranslations("comms");
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [openRootId, setOpenRootId] = useState<number | null>(rootId ?? null);
  const [isPending, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      if (rootId != null) {
        const thread = await getNoteThread(rootId);
        setNotes(thread);
        return;
      }
      const filter = anchor.isPersonal
        ? { personalOnly: true }
        : { projectId: anchor.projectId ?? undefined, activityId: anchor.activityId ?? undefined };
      const fresh = await getNotes(filter);
      setNotes(fresh);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.projectId, anchor.activityId, rootId]);

  const threads = notes ? assembleThreads(notes) : [];
  const openThread = threads.find((th) => th.root.id === openRootId) ?? null;

  function handleResolve(noteId: number) {
    startTransition(async () => {
      const result = await setNoteStatusAction(noteId, "resolved");
      if (result?.error) toast.error(t(result.error as "errorGeneric"));
      else {
        reload();
        onChange?.();
      }
    });
  }

  if (notes === null) {
    return <p className="text-[13px] text-veltol-fgMute">{t("loadingThread")}</p>;
  }

  if (openThread) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" size="sm" onClick={() => setOpenRootId(null)}>
          {t("backToList")}
        </Button>
        <NoteCard note={openThread.root} />
        {openThread.root.status !== "resolved" && (
          <Button variant="outline" size="sm" onClick={() => handleResolve(openThread.root.id)} disabled={isPending}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("markResolved")}
          </Button>
        )}
        <div className="flex flex-col gap-2 border-l border-border pl-4">
          {openThread.replies.length === 0 ? (
            <p className="text-[13px] text-veltol-fgMute">{t("noReplies")}</p>
          ) : (
            openThread.replies.map((reply) => <NoteCard key={reply.id} note={reply} />)
          )}
        </div>
        <NoteComposer parentId={openThread.root.id} onSuccess={reload} autoFocus />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {threads.length === 0 ? (
        <p className="text-[13px] text-veltol-fgMute">{t("emptyThread")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {threads.map((th) => <NoteCard key={th.root.id} note={th.root} onClick={() => setOpenRootId(th.root.id)} />)}
        </div>
      )}
      <NoteComposer fixedAnchor={anchor} fixedAnchorLabel={anchorLabelText} onSuccess={reload} />
    </div>
  );
}
