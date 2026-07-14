"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import * as teamService from "@/features/teams/services/teamService";
import type { Team } from "@/features/teams/types";
import type { ProfileRef } from "@/features/teams/components/TeamMemberPicker";

export type ActionState = { error?: string; success?: string } | null;

async function getTeamsPath() {
  const locale = await getLocale();
  return `/${locale}/teams`;
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

function extractTeamPayload(formData: FormData) {
  const str = (key: string) => {
    const v = formData.get(key) as string | null;
    return v && v.trim() !== "" ? v.trim() : null;
  };
  return {
    name: ((formData.get("name") as string) ?? "").trim(),
    description: str("description"),
    lead_id: str("lead_id"),
  };
}

export async function getTeams(): Promise<Team[]> {
  const { supabase } = await requireAuth();
  const api = createSupabaseTeamsClient(supabase);
  return teamService.getTeams(api);
}

export async function getProfileRefs(): Promise<ProfileRef[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .order("first_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRef[];
}

export async function createTeamAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseTeamsClient(supabase);
    await teamService.createTeam(api, extractTeamPayload(formData));
    revalidatePath(await getTeamsPath());
    return { success: "teamCreated" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function updateTeamAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const api = createSupabaseTeamsClient(supabase);
    const teamId = Number(formData.get("teamId"));
    await teamService.updateTeam(api, teamId, extractTeamPayload(formData));
    revalidatePath(await getTeamsPath());
    return { success: "teamSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
    return { error: "errorGeneric" };
  }
}

export async function deleteTeamAction(id: number): Promise<ActionState> {
  try {
    const { supabase, role } = await getUserProfileRole();
    if (role !== "admin") return { error: "errorNotAllowed" };
    const api = createSupabaseTeamsClient(supabase);
    await teamService.deleteTeam(api, id);
    revalidatePath(await getTeamsPath());
    return { success: "teamDeleted" };
  } catch {
    return { error: "errorGeneric" };
  }
}
