import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommsApiClient, NotesFilter } from "./types";
import type { CreateNotePayload, MentionCandidate, Note, NoteStatus, Notification } from "../types";

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

  async createNote(authorId: string, payload: CreateNotePayload) {
    const { data, error } = await supabase
      .from("notes")
      .insert({
        author_id: authorId,
        kind: payload.kind,
        title: payload.title ?? null,
        body: payload.body,
        color: payload.color ?? null,
        visibility: payload.visibility,
        parent_id: payload.parentId ?? null,
        due_date: payload.dueDate ?? null,
        requires_ack: payload.requiresAck ?? false,
        ack_deadline: payload.ackDeadline ?? null,
        is_personal: payload.anchor.isPersonal ?? false,
        project_id: payload.anchor.projectId ?? null,
        activity_id: payload.anchor.activityId ?? null,
        situation_id: payload.anchor.situationId ?? null,
        client_id: payload.anchor.clientId ?? null,
        subcontractor_id: payload.anchor.subcontractorId ?? null,
        supplier_id: payload.anchor.supplierId ?? null,
        document_id: payload.anchor.documentId ?? null,
        team_id: payload.anchor.teamId ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id as number };
  },

  async insertMentions(noteId: number, profileIds: string[]) {
    if (profileIds.length === 0) return;
    const { error } = await supabase
      .from("note_mentions")
      .insert(profileIds.map((profileId) => ({ note_id: noteId, profile_id: profileId })));
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

  async getMentionCandidates() {
    const { data, error } = await supabase.from("profiles").select("id, first_name, last_name, email");
    if (error) throw new Error(error.message);
    return (data ?? []).map(
      (p): MentionCandidate => ({
        id: p.id as string,
        handle:
          ([p.first_name, p.last_name].filter(Boolean).join("") as string) ||
          (p.email as string).split("@")[0],
      }),
    );
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
});
