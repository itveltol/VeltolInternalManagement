"use client";

import { useTranslations } from "next-intl";
import { Building2, Grid2X2, User as UserIcon, MessageSquare } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { anchorLabel } from "../services/notes";
import type { Note } from "../types";
import { cn } from "@/shared/utils/cn";

const KIND_VARIANT: Record<Note["kind"], "default" | "secondary" | "warning" | "destructive" | "success"> = {
  note: "secondary",
  announcement: "default",
  question: "warning",
  decision: "success",
  risk: "destructive",
};

const COLOR_BORDER: Record<NonNullable<Note["color"]>, string> = {
  accent: "border-l-veltol-accent",
  green: "border-l-[var(--v-success)]",
  orange: "border-l-[var(--v-warning)]",
  red: "border-l-[var(--v-danger)]",
  primary: "border-l-veltol-primary",
};

interface Props {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: Props) {
  const t = useTranslations("comms");
  const anchor = anchorLabel(note);
  const authorName =
    [note.author?.first_name, note.author?.last_name].filter(Boolean).join(" ") || t("unknownAuthor");

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border border-border border-l-2 bg-card p-3 text-left transition-colors hover:bg-veltol-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        note.color ? COLOR_BORDER[note.color] : "border-l-transparent",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant={KIND_VARIANT[note.kind]}>{t(`kind.${note.kind}`)}</Badge>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-veltol-fgMute">
          {anchor.scope === "matrice" ? (
            <Grid2X2 className="h-3 w-3" />
          ) : anchor.scope === "project" ? (
            <Building2 className="h-3 w-3" />
          ) : (
            <UserIcon className="h-3 w-3" />
          )}
          {anchor.scope === "personal" ? t("anchorPersonal") : anchor.text}
        </span>
        {note.unread && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-veltol-accent" aria-hidden="true" />}
      </div>

      {note.title && <div className="text-[14px] font-semibold text-veltol-fg">{note.title}</div>}
      <p className="line-clamp-3 text-[13px] text-veltol-fgDim">{note.body}</p>

      <div className="flex items-center justify-between text-[11px] font-medium text-veltol-fgMute">
        <span>{authorName}</span>
        {note.reply_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {note.reply_count}
          </span>
        )}
      </div>
    </button>
  );
}
