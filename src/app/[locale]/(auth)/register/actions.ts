"use server";

import { createClient } from "@/core/supabase/server";
import { createSupabaseProfileClient } from "@/features/profile/api/supabaseProfileClient";
import * as profileService from "@/features/profile/services/profileService";

export type RegisterActionState = { error?: string; success?: boolean } | null;

export async function completeRegistration(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "errorInvalidInvite" };

  const client = createSupabaseProfileClient(supabase);
  try {
    await profileService.completeRegistration(
      client,
      {
        userId: user.id,
        firstName: formData.get("first_name") as string,
        lastName: formData.get("last_name") as string,
        phone: formData.get("phone") as string,
        password: formData.get("password") as string,
      },
      formData.get("confirm_password") as string,
    );
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      (e.message === "passwordMismatch" ||
        e.message === "passwordTooShort" ||
        e.message === "profileNotFound" ||
        e.message === "alreadyRegistered")
    ) {
      return { error: e.message };
    }
    if (e instanceof Error && e.message.toLowerCase().includes("different from the old password")) {
      return { error: "errorPasswordReused" };
    }
    console.error("[completeRegistration]", e);
    return { error: "errorGeneric" };
  }
  return { success: true };
}
