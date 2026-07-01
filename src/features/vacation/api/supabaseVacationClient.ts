import type { SupabaseClient } from "@supabase/supabase-js";
import type { VacationApiClient, CreateVacationPayload, UpdateVacationPayload } from "./types";
import type { VacationRequest } from "../types";

const SELECT =
  "*, requester:profiles!user_id(first_name, last_name), approver:profiles!approved_by(first_name, last_name)";

export const createSupabaseVacationClient = (supabase: SupabaseClient): VacationApiClient => ({
  async getRequests(userId, isAdmin) {
    let query = supabase
      .from("vacation_requests")
      .select(SELECT)
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.or(`user_id.eq.${userId},status.eq.approved`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as VacationRequest[];
  },

  async createRequest(payload: CreateVacationPayload) {
    const { data, error } = await supabase
      .from("vacation_requests")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateRequest(id, payload: UpdateVacationPayload) {
    const { error } = await supabase
      .from("vacation_requests")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async cancelRequest(id, userId) {
    const { error } = await supabase
      .from("vacation_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
  },

  async approveRequest(id, approverId) {
    const { error } = await supabase
      .from("vacation_requests")
      .update({ status: "approved", approved_by: approverId, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async rejectRequest(id, approverId) {
    const { error } = await supabase
      .from("vacation_requests")
      .update({ status: "rejected", approved_by: approverId, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
});
