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
    // Build the link from token_hash rather than using data.properties.action_link:
    // action_link points at Supabase's own /auth/v1/verify endpoint, which then
    // redirects back with the session as a URL hash fragment. Fragments don't
    // survive copy-paste or cross-device delivery, which broke invites sent to
    // a different browser/network than the inviter's. token_hash + type as query
    // params to our own /auth/confirm route lets the session be established
    // server-side instead.
    const confirmUrl = new URL(redirectTo);
    confirmUrl.searchParams.set("token_hash", data.properties.hashed_token);
    confirmUrl.searchParams.set("type", "invite");
    return { userId: data.user.id, actionLink: confirmUrl.toString() };
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
