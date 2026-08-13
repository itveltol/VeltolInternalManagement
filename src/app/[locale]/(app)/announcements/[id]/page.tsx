import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { AckTable } from "@/features/comms/components/AckTable";
import { AcknowledgeButton } from "@/features/comms/components/AcknowledgeButton";
import { Badge } from "@/shared/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { summarizeAcks } from "@/features/comms/services/notes";
import { getAnnouncement, getAckReceipts, getOwnReceipt } from "../actions";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AnnouncementDetailPage({ params }: Props) {
  const { id } = await params;
  const noteId = Number(id);
  if (isNaN(noteId)) notFound();

  const { user, role } = await getUserProfileRole();
  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const note = await getAnnouncement(noteId);
  if (!note) notFound();

  const isAuthorOrAdmin = role === "admin" || note.author_id === user!.id;
  const [receipts, ownReceipt] = await Promise.all([
    isAuthorOrAdmin ? getAckReceipts(noteId) : Promise.resolve([]),
    isAuthorOrAdmin ? Promise.resolve(null) : getOwnReceipt(noteId),
  ]);

  const t = await getTranslations("comms");
  const authorName =
    [note.author?.first_name, note.author?.last_name].filter(Boolean).join(" ") || t("unknownAuthor");

  return (
    <div className="space-y-6">
      <Link href="/announcements" className="text-[13px] font-medium text-veltol-primary hover:underline">
        {t("backToList")}
      </Link>

      <div className="rounded-card border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Badge>{t("kind.announcement")}</Badge>
          {note.ack_deadline && (
            <span className="text-[12px] font-medium text-veltol-fgMute">
              {t("announcements.deadline", { date: note.ack_deadline })}
            </span>
          )}
        </div>
        {note.title && <h1 className="mt-2 text-xl font-semibold text-veltol-fg">{note.title}</h1>}
        <p className="mt-1 text-[12px] font-medium text-veltol-fgMute">{authorName}</p>
        <p className="mt-4 whitespace-pre-wrap text-[14px] text-veltol-fgDim">{note.body}</p>
      </div>

      {isAuthorOrAdmin ? (
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <AckTable noteId={note.id} summary={summarizeAcks(receipts)} lastReminderAt={note.last_reminder_at} />
        </div>
      ) : (
        // ownReceipt is null for a reader who owes no acknowledgement — not
        // part of the materialized audience (e.g. hired after publication,
        // or reading via a broader visibility than the audience computation
        // covers). Nothing to confirm, so no button.
        note.requires_ack &&
        ownReceipt !== null && (
          <div className="rounded-card border border-border bg-card p-5 shadow-card">
            <AcknowledgeButton noteId={note.id} initiallyAcknowledged={ownReceipt.acknowledgedAt != null} />
          </div>
        )
      )}
    </div>
  );
}
