"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { AppRole, Profile } from "@/lib/types/profile";

export type ActionState = { error?: string; success?: string } | null;

async function getProfilePath() {
  const locale = await getLocale();
  return `/${locale}/profile`;
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireAuth();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");
  return { supabase, user };
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireAuth();
    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const phone = formData.get("phone") as string;

    const { error } = await supabase
      .from("profiles")
      .update({ first_name, last_name, phone })
      .eq("id", user.id);

    if (error) return { error: error.message };

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
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (newPassword !== confirmPassword) return { error: "passwordMismatch" };
    if (newPassword.length < 8) return { error: "passwordTooShort" };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };

    return { success: "passwordChanged" };
  } catch {
    return { error: "errorGeneric" };
  }
}

export async function getAllUsers(): Promise<Profile[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const userId = formData.get("userId") as string;
    const first_name = formData.get("first_name") as string;
    const last_name = formData.get("last_name") as string;
    const phone = formData.get("phone") as string;
    const role = formData.get("role") as AppRole;

    const { error } = await supabase
      .from("profiles")
      .update({ first_name, last_name, phone, role })
      .eq("id", userId);

    if (error) return { error: error.message };

    revalidatePath(await getProfilePath());
    return { success: "profileSaved" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden")
      return { error: "errorNotAdmin" };
    return { error: "errorGeneric" };
  }
}

export async function inviteUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const email = formData.get("email") as string;
    const role = (formData.get("role") as AppRole) ?? "viewer";

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: `${siteUrl}/auth/confirm` },
    );
    if (error) {
      console.error("[inviteUser] Supabase error:", error);
      if (error.message.toLowerCase().includes("already")) {
        return { error: "errorEmailExists" };
      }
      return { error: error.message };
    }

    if (data?.user) {
      await adminClient.from("profiles").upsert({
        id: data.user.id,
        email,
        role,
      });
    }

    revalidatePath(await getProfilePath());
    return { success: "inviteSent" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden")
      return { error: "errorNotAdmin" };
    return { error: "errorGeneric" };
  }
}

export async function deleteUser(userId: string): Promise<ActionState> {
  try {
    const { user } = await requireAdmin();
    if (userId === user.id) return { error: "errorSelfDelete" };

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return { error: error.message };

    revalidatePath(await getProfilePath());
    return { success: "userDeleted" };
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "Forbidden")
      return { error: "errorNotAdmin" };
    return { error: "errorGeneric" };
  }
}
