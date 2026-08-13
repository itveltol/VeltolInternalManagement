"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { AnnouncementComposer } from "./AnnouncementComposer";
import type { AnnouncementListMeta } from "@/app/[locale]/(app)/announcements/actions";
import type { Note } from "../types";

interface Props {
  announcements: Note[];
  canBroadcast: boolean;
  isAdmin: boolean;
  currentUserId: string;
  meta: AnnouncementListMeta;
  projectOptions: { id: number; name: string }[];
  teamOptions: { id: number; name: string }[];
}

export function AnnouncementsShell({
  announcements,
  canBroadcast,
  isAdmin,
  currentUserId,
  meta,
  projectOptions,
  teamOptions,
}: Props) {
  const t = useTranslations("comms");
  const [composing, setComposing] = useState(false);

  return (
    <div className="space-y-6">
      {canBroadcast && (
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("announcements.listTitle")}
          </h2>
          <Button size="sm" onClick={() => setComposing((v) => !v)}>
            {composing ? t("backToList") : t("announcements.new")}
          </Button>
        </div>
      )}

      {composing && (
        <div className="rounded-card border border-border bg-card p-4 shadow-card">
          <AnnouncementComposer
            projectOptions={projectOptions}
            teamOptions={teamOptions}
            onSuccess={() => setComposing(false)}
          />
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-6 text-center text-[13px] text-veltol-fgMute">
          {t("announcements.empty")}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {announcements.map((a) => (
            <AnnouncementRow
              key={a.id}
              note={a}
              showRatio={isAdmin || a.author_id === currentUserId}
              ackCount={meta.ackCounts[a.id]}
              ownReceipt={meta.ownReceipts[a.id]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AnnouncementRow({
  note,
  showRatio,
  ackCount,
  ownReceipt,
}: {
  note: Note;
  showRatio: boolean;
  ackCount?: { total: number; acknowledged: number };
  ownReceipt?: { acknowledgedAt: string | null };
}) {
  const t = useTranslations("comms");
  const authorName =
    [note.author?.first_name, note.author?.last_name].filter(Boolean).join(" ") || t("unknownAuthor");
  const needsMyAck = ownReceipt !== undefined && ownReceipt.acknowledgedAt === null;

  return (
    <li>
      <Link
        href={`/announcements/${note.id}`}
        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-veltol-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge>{t("kind.announcement")}</Badge>
            {needsMyAck && <Badge variant="warning">{t("announcements.needsYourAck")}</Badge>}
            {note.title && <span className="truncate text-[14px] font-semibold text-veltol-fg">{note.title}</span>}
          </div>
          <p className="line-clamp-2 text-[13px] text-veltol-fgDim">{note.body}</p>
          <span className="text-[11px] font-medium text-veltol-fgMute">
            {authorName}
            {note.ack_deadline && ` · ${t("announcements.deadline", { date: note.ack_deadline })}`}
          </span>
        </div>
        {showRatio && ackCount && (
          <span className="shrink-0 rounded-md bg-veltol-surface px-2 py-1 text-[12px] font-semibold text-veltol-fgDim">
            {t("announcements.ackRatio", { acknowledged: ackCount.acknowledged, total: ackCount.total })}
          </span>
        )}
      </Link>
    </li>
  );
}
