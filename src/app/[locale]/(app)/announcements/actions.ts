"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { canBroadcast } from "@/core/auth/permissions";
import { parseFormData } from "@/shared/utils/parseFormData";
import { createSupabaseCommsClient } from "@/features/comms/api/supabaseCommsClient";
import { resolveMentionedProfileIds } from "@/features/comms/services/mentions";
import { postAnnouncementCard } from "@/features/comms/services/outbound/teams";
import type { AckReceipt, CreateNotePayload, Note } from "@/features/comms/types";

export type ActionState = { error?: string; success?: string } | null;

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireBroadcaster() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (!canBroadcast(role)) throw new Error("Forbidden");
  return { supabase, user };
}

async function getAnnouncementsPath() {
  const locale = await getLocale();
  return `/${locale}/announcements`;
}

const optionalTrimmed = () =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().nullable());

const announcementSchema = z.object({
  title: optionalTrimmed(),
  body: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
  visibility: z.enum(["team", "project", "company"]).default("company"),
  ackDeadline: optionalTrimmed(),
  projectId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  teamId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
});

export async function getAnnouncementProjectOptions(): Promise<{ id: number; name: string }[]> {
  const { supabase } = await requireBroadcaster();
  const { data, error } = await supabase.from("projects").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAnnouncementTeamOptions(): Promise<{ id: number; name: string }[]> {
  const { supabase } = await requireBroadcaster();
  const { data, error } = await supabase.from("teams").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAnnouncements(): Promise<Note[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getAnnouncements();
}

export async function getAnnouncement(noteId: number): Promise<Note | null> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getAnnouncement(noteId);
}

export async function getOwnReceipt(noteId: number): Promise<{ acknowledgedAt: string | null } | null> {
  const { supabase, user } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getOwnReceipt(noteId, user.id);
}

export async function getAckReceipts(noteId: number): Promise<AckReceipt[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getAckReceipts(noteId);
}

export interface AnnouncementListMeta {
  ackCounts: Record<number, { total: number; acknowledged: number }>;
  ownReceipts: Record<number, { acknowledgedAt: string | null }>;
}

export async function getAnnouncementListMeta(noteIds: number[]): Promise<AnnouncementListMeta> {
  const { supabase, user } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  const [ackCounts, ownReceipts] = await Promise.all([
    api.getAckCounts(noteIds),
    api.getOwnReceipts(noteIds, user.id),
  ]);
  return {
    ackCounts: Object.fromEntries(ackCounts),
    ownReceipts: Object.fromEntries(ownReceipts),
  };
}

export async function previewAudienceAction(scope: {
  visibility: string;
  projectId: number | null;
  teamId: number | null;
}): Promise<number> {
  const { supabase } = await requireBroadcaster();
  const api = createSupabaseCommsClient(supabase);
  return api.previewAudience(scope);
}

export async function createAnnouncementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await requireBroadcaster();
    const parsed = parseFormData(announcementSchema, formData);
    if (!parsed.success) return { error: parsed.error };

    const payload: CreateNotePayload = {
      kind: "announcement",
      title: parsed.data.title,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
      requiresAck: true,
      ackDeadline: parsed.data.ackDeadline,
      anchor: {
        isPersonal: false,
        projectId: parsed.data.projectId,
        teamId: parsed.data.teamId,
      },
    };

    const api = createSupabaseCommsClient(supabase);
    const { id } = await api.createNote(user.id, payload);

    const candidates = await api.getMentionCandidates({
      visibility: payload.visibility,
      projectId: payload.anchor.projectId ?? null,
      teamId: payload.anchor.teamId ?? null,
    });
    const mentionedIds = resolveMentionedProfileIds(payload.body, candidates, user.id);
    await api.insertMentions(id, mentionedIds);

    revalidatePath(await getAnnouncementsPath());

    // Teams outbound — after the note (and its mentions) have committed.
    // A webhook failure must never surface as a failed publish.
    try {
      let projectName: string | null = null;
      if (payload.anchor.projectId) {
        const { data: project } = await supabase
          .from("projects")
          .select("name")
          .eq("id", payload.anchor.projectId)
          .maybeSingle();
        projectName = project?.name ?? null;
      }
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      const authorName =
        [authorProfile?.first_name, authorProfile?.last_name].filter(Boolean).join(" ") || "—";

      await postAnnouncementCard({
        title: payload.title ?? payload.body.slice(0, 60),
        author: authorName,
        projectName,
        snippet: payload.body.slice(0, 140),
        noteId: id,
      });
    } catch (teamsError) {
      console.error("createAnnouncementAction: Teams webhook failed", teamsError);
    }

    return { success: "announcementCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "Unauthenticated" || e.message === "Forbidden")) {
      return { error: "errorNotAllowed" };
    }
    return { error: "errorGeneric" };
  }
}

export async function acknowledgeAction(noteId: number): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const api = createSupabaseCommsClient(supabase);
    await api.acknowledge(noteId, user.id);
    const locale = await getLocale();
    revalidatePath(`/${locale}/announcements/${noteId}`);
    return { success: "acknowledged" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function sendAckReminderAction(noteId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const api = createSupabaseCommsClient(supabase);
    const { notified } = await api.sendAckReminder(noteId);
    const locale = await getLocale();
    revalidatePath(`/${locale}/announcements/${noteId}`);
    return { success: notified > 0 ? "reminderSent" : "reminderNoneLeft" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("rate_limited")) return { error: "reminderRateLimited" };
    if (e instanceof Error && e.message.includes("forbidden")) return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
