import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEventFilter, CommsApiClient, MentionScope, NotesFilter, NotesPageFilter } from "./types";
import type { ActivityEvent, AckReceipt, CreateNotePayload, MentionCandidate, Note, NoteStatus, Notification } from "../types";

const ACTIVITY_EVENT_SELECT =
  "*, actor:profiles!actor_id(id, first_name, last_name), project:projects!project_id(name)";

type ActivityEventRow = Record<string, unknown> & {
  project?: { name: string | null } | null;
  actor?: { id: string; first_name: string | null; last_name: string | null } | null;
};

function toActivityEvent(row: ActivityEventRow): ActivityEvent {
  const { project, actor, ...rest } = row;
  return {
    ...rest,
    actor: actor ?? null,
    project_name: project?.name ?? null,
  } as ActivityEvent;
}

const NOTE_SELECT =
  "*, author:profiles!author_id(id, first_name, last_name, avatar_url), project:projects!project_id(name), activity:activities!activity_id(name)";

type NoteRow = Record<string, unknown> & {
  project?: { name: string | null } | null;
  activity?: { name: string | null } | null;
  author?: { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
};

function toNote(row: NoteRow): Note {
  const { project, activity, author, ...rest } = row;
  return {
    ...rest,
    author: author ?? null,
    project_name: project?.name ?? null,
    activity_name: activity?.name ?? null,
    reply_count: 0,
    unread: false,
  } as Note;
}

export const createSupabaseCommsClient = (supabase: SupabaseClient): CommsApiClient => ({
  async getNotes(filter: NotesFilter) {
    let query = supabase.from("notes").select(NOTE_SELECT).order("created_at", { ascending: false });

    if (filter.projectId !== undefined) query = query.eq("project_id", filter.projectId);
    if (filter.activityId !== undefined) query = query.eq("activity_id", filter.activityId);
    if (filter.kind !== undefined) query = query.eq("kind", filter.kind);
    if (filter.authorId !== undefined) query = query.eq("author_id", filter.authorId);
    if (filter.openOnly) query = query.eq("status", "open");
    if (filter.personalOnly) query = query.eq("is_personal", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNote);
  },

  async getNoteThread(rootId: number) {
    const { data, error } = await supabase
      .from("notes")
      .select(NOTE_SELECT)
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNote);
  },

  async createNote(_authorId: string, payload: CreateNotePayload) {
    const { data, error } = await supabase.rpc("create_note", {
      p_kind: payload.kind,
      p_title: payload.title ?? null,
      p_body: payload.body,
      p_color: payload.color ?? null,
      p_visibility: payload.visibility,
      p_parent_id: payload.parentId ?? null,
      p_due_date: payload.dueDate ?? null,
      p_requires_ack: payload.requiresAck ?? false,
      p_ack_deadline: payload.ackDeadline ?? null,
      p_is_personal: payload.anchor.isPersonal ?? false,
      p_project_id: payload.anchor.projectId ?? null,
      p_activity_id: payload.anchor.activityId ?? null,
      p_situation_id: payload.anchor.situationId ?? null,
      p_client_id: payload.anchor.clientId ?? null,
      p_subcontractor_id: payload.anchor.subcontractorId ?? null,
      p_supplier_id: payload.anchor.supplierId ?? null,
      p_document_id: payload.anchor.documentId ?? null,
      p_team_id: payload.anchor.teamId ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: data as number };
  },

  async insertMentions(noteId: number, profileIds: string[]) {
    if (profileIds.length === 0) return;
    const { error } = await supabase.rpc("insert_note_mentions", {
      p_note_id: noteId,
      p_profile_ids: profileIds,
    });
    if (error) throw new Error(error.message);
  },

  async setNoteStatus(noteId: number, status: NoteStatus) {
    const { error } = await supabase.from("notes").update({ status }).eq("id", noteId);
    if (error) throw new Error(error.message);
  },

  async deleteNote(noteId: number) {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw new Error(error.message);
  },

  async getMentionCandidates(scope: MentionScope) {
    const { data, error } = await supabase.rpc("get_mention_candidates", {
      p_visibility: scope.visibility,
      p_project_id: scope.projectId,
      p_team_id: scope.teamId,
    });
    if (error) throw new Error(error.message);
    type CandidateRow = { id: string; first_name: string | null; last_name: string | null; email: string };
    return ((data ?? []) as CandidateRow[]).map((p): MentionCandidate => {
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
      return {
        id: p.id,
        handle: [p.first_name, p.last_name].filter(Boolean).join("") || p.email.split("@")[0],
        name: fullName || p.email,
      };
    });
  },

  async getPersonalPinNoteIds(profileId: string) {
    const { data, error } = await supabase.from("note_pins").select("note_id").eq("profile_id", profileId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.note_id as number);
  },

  async getContextPinNoteIds(projectId: number) {
    const { data, error } = await supabase
      .from("note_pins")
      .select("note_id, notes!inner(project_id)")
      .is("profile_id", null)
      .eq("notes.project_id", projectId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.note_id as number);
  },

  async setPersonalPin(noteId: number, profileId: string, pinned: boolean) {
    if (pinned) {
      const { error } = await supabase
        .from("note_pins")
        .insert({ note_id: noteId, profile_id: profileId, pinned_by: profileId });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("note_pins")
        .delete()
        .eq("note_id", noteId)
        .eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    }
  },

  async setContextPin(noteId: number, pinnedBy: string, pinned: boolean) {
    if (pinned) {
      const { error } = await supabase
        .from("note_pins")
        .insert({ note_id: noteId, profile_id: null, pinned_by: pinnedBy });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("note_pins").delete().eq("note_id", noteId).is("profile_id", null);
      if (error) throw new Error(error.message);
    }
  },

  async markSeen(noteIds: number[], profileId: string) {
    if (noteIds.length === 0) return;
    const { error } = await supabase
      .from("note_receipts")
      .upsert(
        noteIds.map((noteId) => ({ note_id: noteId, profile_id: profileId, seen_at: new Date().toISOString() })),
        { onConflict: "note_id,profile_id" },
      );
    if (error) throw new Error(error.message);
  },

  async getNotifications(profileId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Notification[];
  },

  async markNotificationsRead(profileId: string, notificationIds?: number[]) {
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .is("read_at", null);
    if (notificationIds !== undefined) query = query.in("id", notificationIds);
    const { error } = await query;
    if (error) throw new Error(error.message);
  },

  async getAnnouncements() {
    const { data, error } = await supabase
      .from("notes")
      .select(NOTE_SELECT)
      .eq("kind", "announcement")
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNote);
  },

  async getAnnouncement(noteId: number) {
    const { data, error } = await supabase
      .from("notes")
      .select(NOTE_SELECT)
      .eq("id", noteId)
      .eq("kind", "announcement")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toNote(data) : null;
  },

  async previewAudience(scope) {
    const { data, error } = await supabase.rpc("note_audience_preview", {
      p_visibility: scope.visibility,
      p_project_id: scope.projectId,
      p_team_id: scope.teamId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).length;
  },

  async getAckReceipts(noteId: number) {
    type AckReceiptRow = {
      profile_id: string;
      seen_at: string | null;
      acknowledged_at: string | null;
      profile: { first_name: string | null; last_name: string | null; email: string } | null;
    };
    const { data, error } = await supabase
      .from("note_receipts")
      .select("profile_id, seen_at, acknowledged_at, profile:profiles!profile_id(first_name, last_name, email)")
      .eq("note_id", noteId)
      .returns<AckReceiptRow[]>();
    if (error) throw new Error(error.message);
    return (data ?? []).map(
      (r): AckReceipt => ({
        profile_id: r.profile_id,
        name: [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(" ") || r.profile?.email || "",
        seen_at: r.seen_at,
        acknowledged_at: r.acknowledged_at,
      }),
    );
  },

  async getOwnReceipt(noteId: number, profileId: string) {
    const { data, error } = await supabase
      .from("note_receipts")
      .select("acknowledged_at")
      .eq("note_id", noteId)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { acknowledgedAt: data.acknowledged_at as string | null } : null;
  },

  async acknowledge(noteId: number, profileId: string) {
    const { error } = await supabase
      .from("note_receipts")
      .update({ acknowledged_at: new Date().toISOString(), seen_at: new Date().toISOString() })
      .eq("note_id", noteId)
      .eq("profile_id", profileId)
      .is("acknowledged_at", null);
    if (error) throw new Error(error.message);
  },

  async sendAckReminder(noteId: number) {
    const { data, error } = await supabase.rpc("send_ack_reminder", { p_note_id: noteId });
    if (error) throw new Error(error.message);
    return { notified: (data as number | null) ?? 0 };
  },

  async getAckCounts(noteIds: number[]) {
    const counts = new Map<number, { total: number; acknowledged: number }>();
    if (noteIds.length === 0) return counts;
    const { data, error } = await supabase
      .from("note_receipts")
      .select("note_id, acknowledged_at")
      .in("note_id", noteIds);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const noteId = row.note_id as number;
      const entry = counts.get(noteId) ?? { total: 0, acknowledged: 0 };
      entry.total += 1;
      if (row.acknowledged_at !== null) entry.acknowledged += 1;
      counts.set(noteId, entry);
    }
    return counts;
  },

  async getOwnReceipts(noteIds: number[], profileId: string) {
    const receipts = new Map<number, { acknowledgedAt: string | null }>();
    if (noteIds.length === 0) return receipts;
    const { data, error } = await supabase
      .from("note_receipts")
      .select("note_id, acknowledged_at")
      .in("note_id", noteIds)
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      receipts.set(row.note_id as number, { acknowledgedAt: row.acknowledged_at as string | null });
    }
    return receipts;
  },

  async getActivityEvents(filter: ActivityEventFilter) {
    const from = filter.page * filter.pageSize;
    const to = from + filter.pageSize - 1;

    let query = supabase
      .from("activity_events")
      .select(ACTIVITY_EVENT_SELECT)
      .order("created_at", { ascending: false })
      .range(from, to + 1); // fetch one extra row to know if another page exists

    if (filter.projectId !== undefined) query = query.eq("project_id", filter.projectId);
    if (filter.actorId !== undefined) query = query.eq("actor_id", filter.actorId);
    if (filter.verbPrefix !== undefined) query = query.like("verb", `${filter.verbPrefix}.%`);
    if (filter.from !== undefined) query = query.gte("created_at", filter.from);
    if (filter.to !== undefined) query = query.lte("created_at", filter.to);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const hasMore = rows.length > filter.pageSize;
    return { events: rows.slice(0, filter.pageSize).map(toActivityEvent), hasMore };
  },

  async getNotesPage(filter: NotesPageFilter) {
    const from = filter.page * filter.pageSize;
    const to = from + filter.pageSize - 1;

    let query = supabase
      .from("notes")
      .select(NOTE_SELECT)
      .order("created_at", { ascending: false })
      .range(from, to + 1);

    if (filter.projectId !== undefined) query = query.eq("project_id", filter.projectId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const hasMore = rows.length > filter.pageSize;
    return { notes: rows.slice(0, filter.pageSize).map(toNote), hasMore };
  },
});
