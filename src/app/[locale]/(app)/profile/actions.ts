"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseProfileClient } from "@/features/profile/api/supabaseProfileClient";
import * as profileService from "@/features/profile/services/profileService";
import type { AppRole } from "@/features/profile/types";
import type { Profile } from "@/features/profile/types";
import { grantProjectFolderAccess } from "@/core/microsoft/folderProvider";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import * as teamService from "@/features/teams/services/teamService";
import type { TeamWorker } from "@/features/teams/types";

export type ActionState = { error?: string; success?: string; actionLink?: string } | null;

export interface OutfieldWorkerRow extends TeamWorker {
  team_name: string;
}

async function getProfilePath() {
  const locale = await getLocale();
  return `/${locale}/profile`;
}

/** Grants a newly invited user access to every existing project folder. Best-effort — never blocks the invite. */
async function grantAllExistingFolderAccessToUser(email: string) {
  try {
    const { data, error } = await createAdminClient()
      .from("projects")
      .select("onedrive_folder_id")
      .not("onedrive_folder_id", "is", null);
    if (error) throw new Error(error.message);
    const folderIds = (data ?? [])
      .map((row) => row.onedrive_folder_id as string | null)
      .filter((id): id is string => Boolean(id));

    const results = await Promise.allSettled(
      folderIds.map((folderId) => grantProjectFolderAccess(folderId, [email])),
    );
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error(
        `grantAllExistingFolderAccessToUser: ${failures.length}/${folderIds.length} folder grants failed for ${email}`,
        failures,
      );
    }
  } catch (e) {
    console.error("grantAllExistingFolderAccessToUser failed:", e);
  }
}

async function requireAuth() {
  const { supabase, user } = await getSessionUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user, role } = await getUserProfileRole();
  if (!user) throw new Error("Unauthenticated");
  if (role !== "admin") throw new Error("Forbidden");
  return { supabase, user };
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const client = createSupabaseProfileClient(supabase);
    await profileService.updateProfile(client, user.id, {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      phone: formData.get("phone") as string,
    });
    revalidatePath(await getProfilePath());
    return { success: "profileSaved" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAuth();
    const client = createSupabaseProfileClient(supabase);
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;
    await profileService.changePassword(client, newPassword, confirmPassword);
    return { success: "passwordChanged" };
  } catch (e: unknown) {
    if (e instanceof Error && (e.message === "passwordMismatch" || e.message === "passwordTooShort")) {
      return { error: e.message };
    }
    return { error: "errorGeneric" };
  }
}

export async function getAllUsers(): Promise<Profile[]> {
  const { supabase } = await requireAdmin();
  const client = createSupabaseProfileClient(supabase);
  return profileService.getAllUsers(client);
}

export async function getAllOutfieldWorkers(): Promise<OutfieldWorkerRow[]> {
  const { supabase } = await requireAdmin();
  const api = createSupabaseTeamsClient(supabase);
  const [workers, teams] = await Promise.all([
    teamService.getAllTeamWorkers(api),
    teamService.getTeams(api),
  ]);
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));
  return workers.map((w) => ({ ...w, team_name: (w.team_id !== null ? teamNameById.get(w.team_id) : null) ?? "" }));
}

export async function getTeamsForWorkerForm(): Promise<{ id: number; name: string }[]> {
  const { supabase } = await requireAdmin();
  const api = createSupabaseTeamsClient(supabase);
  const teams = await teamService.getTeams(api);
  return teams.map((t) => ({ id: t.id, name: t.name }));
}

export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const client = createSupabaseProfileClient(supabase);
    const medicalRaw = ((formData.get("medical_exam_expires_at") as string) ?? "").trim();
    await profileService.updateUser(client, formData.get("userId") as string, {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as AppRole,
      medical_exam_expires_at: medicalRaw || null,
    });
    revalidatePath(await getProfilePath());
    return { success: "profileSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAdmin" };
    return { error: "errorGeneric" };
  }
}

export async function inviteUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const adminClient = createAdminClient();
    const client = createSupabaseProfileClient(supabase, adminClient as Parameters<typeof createSupabaseProfileClient>[1]);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const email = formData.get("email") as string;
    const { actionLink } = await profileService.inviteUser(client, {
      email,
      role: (formData.get("role") as AppRole) ?? "viewer",
      redirectTo: `${siteUrl}/auth/confirm`,
    });
    await grantAllExistingFolderAccessToUser(email);
    revalidatePath(await getProfilePath());
    return { success: "inviteLinkTitle", actionLink };
  } catch (e: unknown) {
    console.error("[inviteUser]", e);
    if (e instanceof Error) {
      if (e.message === "Forbidden") return { error: "errorNotAdmin" };
      if (e.message.toLowerCase().includes("already")) return { error: "errorEmailExists" };
    }
    return { error: "errorGeneric" };
  }
}

export async function deleteUser(userId: string): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAdmin();
    if (userId === user.id) return { error: "errorSelfDelete" };
    const adminClient = createAdminClient();
    const client = createSupabaseProfileClient(supabase, adminClient as Parameters<typeof createSupabaseProfileClient>[1]);
    await profileService.deleteUser(client, userId);
    revalidatePath(await getProfilePath());
    return { success: "userDeleted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAdmin" };
    return { error: "errorGeneric" };
  }
}
