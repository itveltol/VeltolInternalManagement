"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseScheduleClient } from "@/features/schedule/api/supabaseScheduleClient";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import * as scheduleService from "@/features/schedule/services/scheduleService";
import type { WeekGrid, ScheduleEntryProject } from "@/features/schedule/types";

export type ActionState = { error?: string; success?: string } | null;

async function getSchedulePath() {
  const locale = await getLocale();
  return `/${locale}/schedule`;
}

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireMutator() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (!["admin", "project_manager"].includes(role ?? "")) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

function mapError(e: unknown): ActionState {
  if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
  return { error: "errorGeneric" };
}

export async function getWeekGrid(weekStart: string): Promise<WeekGrid> {
  const { supabase } = await requireAuth();
  const scheduleClient = createSupabaseScheduleClient(supabase);
  const teamsClient = createSupabaseTeamsClient(supabase);
  return scheduleService.getWeekGrid(scheduleClient, teamsClient, weekStart);
}

export async function searchProjectsAction(query: string): Promise<ScheduleEntryProject[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  return client.searchProjects(query);
}

export async function createScheduleEntryAction(
  teamId: number,
  workDate: string,
  sortOrder: number,
  payload: { project_id: number | null; label: string; color: string | null },
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseScheduleClient(supabase);
    await client.createEntry(
      { team_id: teamId, work_date: workDate, sort_order: sortOrder, ...payload },
      user.id,
    );
    revalidatePath(await getSchedulePath());
    return { success: "entrySaved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function updateScheduleEntryAction(
  id: number,
  payload: { project_id: number | null; label: string; color: string | null },
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseScheduleClient(supabase);
    await client.updateEntry(id, payload, user.id);
    revalidatePath(await getSchedulePath());
    return { success: "entrySaved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function deleteScheduleEntryAction(id: number): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseScheduleClient(supabase);
    await client.deleteEntry(id);
    revalidatePath(await getSchedulePath());
    return { success: "entryDeleted" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function upsertWeekNoteAction(
  teamId: number,
  weekStart: string,
  note: string,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseScheduleClient(supabase);
    await client.upsertWeekNote(teamId, weekStart, note);
    revalidatePath(await getSchedulePath());
    return { success: "noteSaved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}
