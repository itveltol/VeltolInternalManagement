import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/core/supabase/admin";
import { buildDigest, type DigestNoteDueToday, type DigestSection } from "@/features/comms/services/digest";
import type { Notification } from "@/features/comms/types";

type ProfileRow = { id: string; email: string; first_name: string | null; last_name: string | null; locale: string };

const SECTION_TITLE_KEY: Record<DigestSection["key"], string> = {
  ackRequired: "sectionAckRequired",
  mentions: "sectionMentions",
  replies: "sectionReplies",
  dueToday: "sectionDueToday",
  other: "sectionOther",
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("comms-digest: CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ sent: 0, skipped: 0 }); // Clean no-op when Resend isn't configured.
  }
  const resend = new Resend(apiKey);

  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { data: recipients, error: recipientsError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, locale")
    .eq("email_digest_enabled", true);
  if (recipientsError) {
    return NextResponse.json({ error: recipientsError.message }, { status: 500 });
  }
  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 });
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  let sent = 0;
  let skipped = 0;

  for (const profile of recipients as ProfileRow[]) {
    const { data: notifications, error: notificationsError } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profile.id)
      .is("read_at", null);
    if (notificationsError) {
      return NextResponse.json({ error: notificationsError.message }, { status: 500 });
    }

    const { data: dueNotesRaw, error: dueNotesError } = await supabase
      .from("notes")
      .select("id, title, body, status")
      .eq("author_id", profile.id)
      .eq("status", "open")
      .eq("due_date", todayIso);
    if (dueNotesError) {
      return NextResponse.json({ error: dueNotesError.message }, { status: 500 });
    }

    const notesDueToday: DigestNoteDueToday[] = (dueNotesRaw ?? []).map((n) => ({
      noteId: n.id as number,
      title: n.title as string | null,
      snippet: (n.body as string).slice(0, 140),
      href: `/board?note=${n.id}`,
    }));

    const digest = buildDigest({ notifications: (notifications ?? []) as Notification[], notesDueToday });
    if (digest.totalCount === 0) {
      skipped += 1;
      continue;
    }

    const t = await getTranslations({ locale: profile.locale, namespace: "cronEmails.digest" });
    const recipientName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email;

    const sectionsHtml = digest.sections
      .map((section) => {
        const itemsHtml = section.items
          .map((item) => `<li>${item.snippet}${item.href ? ` — <a href="${baseUrl}${item.href}">${t("openInApp")}</a>` : ""}</li>`)
          .join("");
        return `<h3>${t(SECTION_TITLE_KEY[section.key] as "sectionOther")}</h3><ul>${itemsHtml}</ul>`;
      })
      .join("");

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: profile.email,
      subject: t("subject", { count: digest.totalCount }),
      html: `<p>${t("greeting", { name: recipientName })}</p><p>${t("intro")}</p>${sectionsHtml}<p>${t("footer")}</p>`,
    });
    if (sendError) {
      console.error(`comms-digest: send failed for ${profile.email}`, sendError);
      continue;
    }
    sent += 1;
  }

  return NextResponse.json({ sent, skipped });
}
