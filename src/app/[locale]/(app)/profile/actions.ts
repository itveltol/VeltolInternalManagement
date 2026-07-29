"use server";

import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createSupabaseProfileClient } from "@/features/profile/api/supabaseProfileClient";
import * as profileService from "@/features/profile/services/profileService";
import type { AppRole } from "@/features/profile/types";
import type { Profile } from "@/features/profile/types";

export type ActionState = { error?: string; success?: string; actionLink?: string } | null;

async function getProfilePath() {
  const locale = await getLocale();
  return `/${locale}/profile`;
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

    const { actionLink } = await profileService.inviteUser(client, {
      email: formData.get("email") as string,
      role: (formData.get("role") as AppRole) ?? "viewer",
      redirectTo: `${siteUrl}/auth/confirm`,
    });
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
