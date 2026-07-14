"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import * as teamService from "@/features/teams/services/teamService";
import type { Team, TeamMember } from "@/features/teams/types";

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
