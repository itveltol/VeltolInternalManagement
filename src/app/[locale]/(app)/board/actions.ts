"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { canBroadcast } from "@/core/auth/permissions";
import { parseFormData } from "@/shared/utils/parseFormData";
import { createSupabaseCommsClient } from "@/features/comms/api/supabaseCommsClient";
import { resolveMentionedProfileIds } from "@/features/comms/services/mentions";
import { mergeFeed } from "@/features/comms/services/activityFeed";
import { ackRatePct } from "@/features/comms/services/metrics";
import type { CommsMetrics, CreateNotePayload, FeedItem, Note, NoteStatus, Notification } from "@/features/comms/types";
import type { NotesFilter } from "@/features/comms/api/types";

const TIMELINE_PAGE_SIZE = 20;

export type ActionState = { error?: string; success?: string } | null;

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function getBoardPath() {
  const locale = await getLocale();
  return `/${locale}/board`;
}

const optionalTrimmed = () =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().nullable());

const noteSchema = z.object({
  kind: z.enum(["note", "announcement", "question", "decision", "risk"]).default("note"),
  title: optionalTrimmed(),
  body: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1)),
  color: z
    .enum(["accent", "green", "orange", "red", "primary"])
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  visibility: z.enum(["private", "team", "project", "company"]).default("project"),
  parentId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  dueDate: optionalTrimmed(),
  isPersonal: z.preprocess((v) => v === "true" || v === "on", z.boolean()).default(false),
  projectId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  activityId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  situationId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  clientId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  subcontractorId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  supplierId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  documentId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  teamId: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
});

export async function getNotes(filter: NotesFilter): Promise<Note[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getNotes(filter);
}

export async function getNoteThread(rootId: number): Promise<Note[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getNoteThread(rootId);
}

export async function createNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const parsed = parseFormData(noteSchema, formData);
    if (!parsed.success) return { error: parsed.error };

    const payload: CreateNotePayload = {
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      color: parsed.data.color,
      visibility: parsed.data.visibility,
      parentId: parsed.data.parentId,
      dueDate: parsed.data.dueDate,
      anchor: {
        isPersonal: parsed.data.isPersonal,
        projectId: parsed.data.projectId,
        activityId: parsed.data.activityId,
        situationId: parsed.data.situationId,
        clientId: parsed.data.clientId,
        subcontractorId: parsed.data.subcontractorId,
        supplierId: parsed.data.supplierId,
        documentId: parsed.data.documentId,
        teamId: parsed.data.teamId,
      },
    };

    const api = createSupabaseCommsClient(supabase);
    const { id } = await api.createNote(user.id, payload);

    const candidates = await api.getMentionCandidates();
    const mentionedIds = resolveMentionedProfileIds(payload.body, candidates, user.id);
    await api.insertMentions(id, mentionedIds);

    revalidatePath(await getBoardPath());
    if (payload.anchor.projectId) {
      const locale = await getLocale();
      revalidatePath(`/${locale}/projects/${payload.anchor.projectId}`);
    }
    return { success: "noteCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Unauthenticated") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function setNoteStatusAction(noteId: number, status: NoteStatus): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const api = createSupabaseCommsClient(supabase);
    await api.setNoteStatus(noteId, status);
    revalidatePath(await getBoardPath());
    return { success: "noteStatusUpdated" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function deleteNoteAction(noteId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const api = createSupabaseCommsClient(supabase);
    await api.deleteNote(noteId);
    revalidatePath(await getBoardPath());
    return { success: "noteDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function togglePersonalPinAction(noteId: number, pinned: boolean): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const api = createSupabaseCommsClient(supabase);
    await api.setPersonalPin(noteId, user.id, pinned);
    revalidatePath(await getBoardPath());
    return { success: pinned ? "notePinned" : "noteUnpinned" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function toggleContextPinAction(noteId: number, pinned: boolean): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const api = createSupabaseCommsClient(supabase);
    await api.setContextPin(noteId, user.id, pinned);
    revalidatePath(await getBoardPath());
    return { success: pinned ? "notePinned" : "noteUnpinned" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function markNotesSeenAction(noteIds: number[]): Promise<void> {
  const { supabase, user } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  await api.markSeen(noteIds, user.id);
}

export async function getNotifications(): Promise<Notification[]> {
  const { supabase, user } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getNotifications(user.id);
}

export async function markNotificationsReadAction(notificationIds?: number[]): Promise<void> {
  const { supabase, user } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  await api.markNotificationsRead(user.id, notificationIds);
}

export async function getMentionCandidatesAction() {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getMentionCandidates();
}

export async function getContextPinNoteIdsAction(projectId: number): Promise<number[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);
  return api.getContextPinNoteIds(projectId);
}

// Project "Comunicare" tab timeline: activity_events + notes for one
// project, merged and paginated server-side. Each source is fetched with
// .range() for this page only — never the whole history — so the network
// payload does not grow with total history. Page boundaries can split a
// 30-minute event group across two pages; accepted tradeoff for keeping
// pagination genuinely server-side on two independently-ordered sources.
export async function getProjectTimelinePage(
  projectId: number,
  page: number,
): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const { supabase } = await requireAuth();
  const api = createSupabaseCommsClient(supabase);

  const [eventsPage, notesPage] = await Promise.all([
    api.getActivityEvents({ projectId, page, pageSize: TIMELINE_PAGE_SIZE }),
    api.getNotesPage({ projectId, page, pageSize: TIMELINE_PAGE_SIZE }),
  ]);

  const items = mergeFeed(eventsPage.events, notesPage.notes.filter((n) => n.parent_id === null));
  return { items, hasMore: eventsPage.hasMore || notesPage.hasMore };
}

// The four communication-health metrics (module plan §9): ack rate, stale
// questions, silent projects, decisions/month — each vs. its own previous
// period, using the SAME predicate for both periods via the *_as_of() SQL
// functions (never a different definition for "before" vs. "now").
//
// Gated on canBroadcast(role) and read through the session-scoped client —
// never createAdminClient() — so a viewer cannot learn the portfolio's
// communication state through this action even by calling it directly; the
// underlying SQL views/functions are security_invoker too, so RLS applies
// on both sides of this belt-and-suspenders gate.
export async function getCommsMetrics(): Promise<CommsMetrics | null> {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user || !canBroadcast(role)) return null;

  const api = createSupabaseCommsClient(supabase);
  const now = new Date();
  const periodEnd = now.toISOString();
  const previousPeriodEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [ackNow, ackPrev, staleNow, stalePrev, silentNow, silentPrev, decisionsNow, decisionsPrev] =
    await Promise.all([
      api.getAckRateRaw(periodEnd),
      api.getAckRateRaw(previousPeriodEnd),
      api.getStaleQuestionsCount(periodEnd),
      api.getStaleQuestionsCount(previousPeriodEnd),
      api.getSilentProjectsCount(periodEnd),
      api.getSilentProjectsCount(previousPeriodEnd),
      api.getDecisionsCount(periodEnd),
      api.getDecisionsCount(previousPeriodEnd),
    ]);

  return {
    ackRate: {
      value: ackRatePct(ackNow.acknowledgedWithin24h, ackNow.totalReceipts),
      previousValue: ackRatePct(ackPrev.acknowledgedWithin24h, ackPrev.totalReceipts),
    },
    staleQuestions: { value: staleNow, previousValue: stalePrev },
    silentProjects: { value: silentNow, previousValue: silentPrev },
    decisions: { value: decisionsNow, previousValue: decisionsPrev },
  };
}
