import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProfileApiClient,
  UpdateProfilePayload,
  UpdateUserPayload,
  InviteUserPayload,
  CompleteRegistrationPayload,
} from "./types";
import type { Profile, AppRole } from "../types";

export const createSupabaseProfileClient = (
  supabase: SupabaseClient,
  adminClient?: SupabaseClient
): ProfileApiClient => ({
  async getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) return null;
    return data as Profile;
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Profile[];
  },

  async updateProfile(userId, payload: UpdateProfilePayload) {
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);
    if (error) throw new Error(error.message);
  },

  async changePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async inviteUser({ email, role, redirectTo }: InviteUserPayload) {
    if (!adminClient) throw new Error("Admin client required for inviteUser");
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });
    if (error) throw error;
    return { userId: data.user.id, actionLink: data.properties.action_link };
  },

  async upsertProfileRow(userId, email, role: AppRole) {
    if (!adminClient) throw new Error("Admin client required for upsertProfileRow");
    const { error } = await adminClient.from("profiles").upsert({ id: userId, email, role });
    if (error) throw new Error(error.message);
  },

  async completeRegistration({ userId, firstName, lastName, phone, password }: CompleteRegistrationPayload) {
    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) throw pwError;
    const { data, error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
        registered_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .is("registered_at", null)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("profileNotFound");
  },

  async deleteUser(userId) {
    if (!adminClient) throw new Error("Admin client required for deleteUser");
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  },
});
