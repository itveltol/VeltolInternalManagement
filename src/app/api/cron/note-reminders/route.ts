import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/core/supabase/admin";

type NoteRow = {
  id: number;
  author_id: string | null;
  body: string;
  kind: string;
  due_date: string | null;
  ack_deadline: string | null;
  requires_ack: boolean;
  status: string;
  project_id: number | null;
  project_name: string | null;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("note-reminders: CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const todayIso = toIsoDate(today);
  const tomorrowIso = toIsoDate(new Date(today.getTime() + 24 * 60 * 60 * 1000));

  let dueSoonNotified = 0;
  let ackStalledNotified = 0;

  // --- due_soon: root notes with due_date today/tomorrow, still open -------
  const { data: dueNotesRaw, error: dueNotesError } = await supabase
    .from("notes")
    .select("id, author_id, body, kind, due_date, ack_deadline, requires_ack, status, project_id, project:projects!project_id(name)")
    .is("parent_id", null)
    .eq("status", "open")
    .in("due_date", [todayIso, tomorrowIso]);
  if (dueNotesError) {
    return NextResponse.json({ error: dueNotesError.message }, { status: 500 });
  }

  const dueNotes: NoteRow[] = (dueNotesRaw ?? []).map((r) => ({
    id: r.id,
    author_id: r.author_id,
    body: r.body,
    kind: r.kind,
    due_date: r.due_date,
    ack_deadline: r.ack_deadline,
    requires_ack: r.requires_ack,
    status: r.status,
    project_id: r.project_id,
    project_name: (r as unknown as { project?: { name: string | null } | null }).project?.name ?? null,
  }));

  for (const note of dueNotes) {
    const recipients = new Set<string>();
    if (note.author_id) recipients.add(note.author_id);

    const { data: mentions, error: mentionsError } = await supabase
      .from("note_mentions")
      .select("profile_id")
      .eq("note_id", note.id);
    if (mentionsError) {
      return NextResponse.json({ error: mentionsError.message }, { status: 500 });
    }
    for (const m of mentions ?? []) recipients.add(m.profile_id as string);

    for (const profileId of recipients) {
      const { data: already } = await supabase
        .from("note_reminders_sent")
        .select("id")
        .eq("note_id", note.id)
        .eq("profile_id", profileId)
        .eq("kind", "due_soon")
        .eq("due_date", note.due_date)
        .maybeSingle();
      if (already) continue;

      const { error: insertError } = await supabase.from("note_reminders_sent").insert({
        note_id: note.id,
        profile_id: profileId,
        kind: "due_soon",
        due_date: note.due_date,
      });
      if (insertError) {
        // Unique violation means a concurrent run already claimed this — skip, not an error.
        if (!insertError.message.includes("duplicate key")) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        continue;
      }

      await supabase.from("notifications").insert({
        profile_id: profileId,
        type: "due_soon",
        note_id: note.id,
        project_id: note.project_id,
        payload: {
          projectName: note.project_name,
          snippet: note.body.slice(0, 140),
          noteKind: note.kind,
        },
        href: note.project_id ? `/board?note=${note.id}&project=${note.project_id}` : `/board?note=${note.id}`,
      });
      dueSoonNotified += 1;
    }
  }

  // --- ack_required chasing: requires_ack notes past ack_deadline with -----
  // --- unconfirmed receipts — re-notify stragglers and the author. ---------
  const { data: overdueRaw, error: overdueError } = await supabase
    .from("notes")
    .select("id, author_id, body, kind, project_id, project:projects!project_id(name)")
    .is("parent_id", null)
    .eq("requires_ack", true)
    .lt("ack_deadline", todayIso);
  if (overdueError) {
    return NextResponse.json({ error: overdueError.message }, { status: 500 });
  }

  for (const row of overdueRaw ?? []) {
    const note = {
      id: row.id as number,
      author_id: row.author_id as string | null,
      body: row.body as string,
      kind: row.kind as string,
      project_id: row.project_id as number | null,
      project_name: (row as unknown as { project?: { name: string | null } | null }).project?.name ?? null,
    };

    const { data: stragglers, error: stragglersError } = await supabase
      .from("note_receipts")
      .select("profile_id")
      .eq("note_id", note.id)
      .is("acknowledged_at", null);
    if (stragglersError) {
      return NextResponse.json({ error: stragglersError.message }, { status: 500 });
    }
    if (!stragglers || stragglers.length === 0) continue;

    const recipients = new Set<string>(stragglers.map((s) => s.profile_id as string));
    if (note.author_id) recipients.add(note.author_id);

    for (const profileId of recipients) {
      const { data: already } = await supabase
        .from("note_reminders_sent")
        .select("id")
        .eq("note_id", note.id)
        .eq("profile_id", profileId)
        .eq("kind", "ack_stalled")
        .is("due_date", null)
        .maybeSingle();
      if (already) continue;

      const { error: insertError } = await supabase.from("note_reminders_sent").insert({
        note_id: note.id,
        profile_id: profileId,
        kind: "ack_stalled",
        due_date: null,
      });
      if (insertError) {
        if (!insertError.message.includes("duplicate key")) {
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        continue;
      }

      await supabase.from("notifications").insert({
        profile_id: profileId,
        type: "ack_required",
        note_id: note.id,
        project_id: note.project_id,
        payload: {
          projectName: note.project_name,
          snippet: note.body.slice(0, 140),
          noteKind: note.kind,
        },
        href: `/announcements/${note.id}`,
      });
      ackStalledNotified += 1;
    }
  }

  return NextResponse.json({ dueSoonNotified, ackStalledNotified });
}
