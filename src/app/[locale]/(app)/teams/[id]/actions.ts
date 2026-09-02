"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import * as teamService from "@/features/teams/services/teamService";
import type { Team, TeamMember, TeamWorker } from "@/features/teams/types";
import type { TeamWorkerPayload } from "@/features/teams/api/types";

export type ActionState = { error?: string; success?: string } | null;

async function getTeamPath(teamId: number) {
  const locale = await getLocale();
  return `/${locale}/teams/${teamId}`;
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

export async function getTeam(id: number): Promise<Team | null> {
  const { supabase } = await requireAuth();
  const api = createSupabaseTeamsClient(supabase);
  return teamService.getTeamById(api, id);
}

export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseTeamsClient(supabase);
  return teamService.getTeamMembers(api, teamId);
}

export async function addTeamMemberAction(teamId: number, userId: string): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseTeamsClient(supabase);
    await teamService.addTeamMember(api, teamId, userId);
    revalidatePath(await getTeamPath(teamId));
    return { success: "memberAdded" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function removeTeamMemberAction(teamId: number, userId: string): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseTeamsClient(supabase);
    await teamService.removeTeamMember(api, teamId, userId);
    revalidatePath(await getTeamPath(teamId));
    return { success: "memberRemoved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function getTeamWorkers(teamId: number): Promise<TeamWorker[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseTeamsClient(supabase);
  return teamService.getTeamWorkers(api, teamId);
}

function workerPayloadFromForm(formData: FormData): TeamWorkerPayload {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  return {
    first_name: firstName,
    last_name: lastName || null,
    phone: phone || null,
    notes: notes || null,
  };
}

export async function addWorkerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const api = createSupabaseTeamsClient(supabase);
    const teamId = Number(formData.get("teamId"));
    const payload = workerPayloadFromForm(formData);
    if (!payload.first_name) return { error: "errorGeneric" };
    await teamService.addTeamWorker(api, teamId, payload, user.id);
    revalidatePath(await getTeamPath(teamId));
    return { success: "workerAdded" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateWorkerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const api = createSupabaseTeamsClient(supabase);
    const workerId = Number(formData.get("workerId"));
    const teamId = Number(formData.get("teamId"));
    const payload = workerPayloadFromForm(formData);
    if (!payload.first_name) return { error: "errorGeneric" };
    await teamService.updateTeamWorker(api, workerId, payload, user.id);
    revalidatePath(await getTeamPath(teamId));
    return { success: "workerSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function removeWorkerAction(workerId: number, teamId: number): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseTeamsClient(supabase);
    await teamService.removeTeamWorker(api, workerId);
    revalidatePath(await getTeamPath(teamId));
    return { success: "workerRemoved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}
