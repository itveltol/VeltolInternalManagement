import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  VacationApiClient,
  CreateVacationPayload,
  UpdateVacationPayload,
  LogWorkerAbsencePayload,
  CreateAdjustmentPayload,
  BalanceRequestRow,
} from "./types";
import type { VacationRequest, VacationAllowance, VacationAdjustment, VacationSubject } from "../types";

function subjectColumns(subject: VacationSubject) {
  return subject.kind === "user"
    ? { user_id: subject.id, team_worker_id: null }
    : { user_id: null, team_worker_id: subject.id };
}

function subjectColumn(subject: VacationSubject): "user_id" | "team_worker_id" {
  return subject.kind === "user" ? "user_id" : "team_worker_id";
}

// Raised by the vacation_requests_no_overlap trigger.
function throwWriteError(error: { code?: string; message: string }): never {
  if (error.code === "23P01") throw new Error("Overlap");
  throw new Error(error.message);
}

const SELECT =
  "*, requester:profiles!user_id(first_name, last_name), approver:profiles!approved_by(first_name, last_name), teamWorker:team_workers!team_worker_id(first_name, last_name)";

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

  async getRequestsForUser(userId) {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select(SELECT)
      .eq("user_id", userId)
      .order("start_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as VacationRequest[];
  },

  async getBalanceRows() {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select("user_id, team_worker_id, start_date, end_date, status, leave_type")
      .in("status", ["approved", "pending"]);
    if (error) throw new Error(error.message);
    return (data ?? []) as BalanceRequestRow[];
  },

  async getAllowances(subject) {
    let query = supabase
      .from("vacation_allowances")
      .select("id, user_id, team_worker_id, year, base_days")
      .order("year", { ascending: true });
    if (subject) query = query.eq(subjectColumn(subject), subject.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((a) => ({ ...a, base_days: Number(a.base_days) })) as VacationAllowance[];
  },

  // Select-then-write: the (subject, year) uniqueness lives on partial
  // indexes, which PostgREST's onConflict can't target.
  async upsertAllowance(subject, year, baseDays) {
    const { data: existing, error: findError } = await supabase
      .from("vacation_allowances")
      .select("id")
      .eq(subjectColumn(subject), subject.id)
      .eq("year", year)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    const { error } = existing
      ? await supabase.from("vacation_allowances").update({ base_days: baseDays }).eq("id", existing.id)
      : await supabase.from("vacation_allowances").insert({ ...subjectColumns(subject), year, base_days: baseDays });
    if (error) throw new Error(error.message);
  },

  async getAdjustments(subject) {
    let query = supabase
      .from("vacation_adjustments")
      .select("*, author:profiles!created_by(first_name, last_name)")
      .order("created_at", { ascending: true });
    if (subject) query = query.eq(subjectColumn(subject), subject.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((a) => ({ ...a, days: Number(a.days) })) as VacationAdjustment[];
  },

  async createAdjustment(payload: CreateAdjustmentPayload) {
    const { error } = await supabase.from("vacation_adjustments").insert({
      ...subjectColumns(payload.subject),
      year: payload.year,
      days: payload.days,
      note: payload.note,
      created_by: payload.created_by,
    });
    if (error) throw new Error(error.message);
  },

  async deleteAdjustment(id) {
    const { error } = await supabase.from("vacation_adjustments").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async getById(id) {
    const { data, error } = await supabase
      .from("vacation_requests")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? (data as unknown as VacationRequest) : null;
  },

  async createRequest(payload: CreateVacationPayload) {
    const { data, error } = await supabase
      .from("vacation_requests")
      .insert(payload)
      .select("id")
      .single();
    if (error) throwWriteError(error);
    return { id: (data as { id: number }).id };
  },

  async updateRequest(id, payload: UpdateVacationPayload) {
    const { error } = await supabase
      .from("vacation_requests")
      .update(payload)
      .eq("id", id);
    if (error) throwWriteError(error);
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
    if (error) throwWriteError(error);
  },

  async rejectRequest(id, approverId) {
    const { error } = await supabase
      .from("vacation_requests")
      .update({ status: "rejected", approved_by: approverId, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async logWorkerAbsence(payload: LogWorkerAbsencePayload) {
    const { data, error } = await supabase
      .from("vacation_requests")
      .insert({
        team_worker_id: payload.team_worker_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        reason: payload.reason,
        leave_type: payload.leave_type,
        status: "approved",
        approved_by: payload.approved_by,
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throwWriteError(error);
    return { id: (data as { id: number }).id };
  },

  async getApprovedOverlapping(profileIds, teamWorkerIds, rangeStart, rangeEnd) {
    if (profileIds.length === 0 && teamWorkerIds.length === 0) return [];
    const subjectFilters: string[] = [];
    if (profileIds.length > 0) subjectFilters.push(`user_id.in.(${profileIds.join(",")})`);
    if (teamWorkerIds.length > 0) subjectFilters.push(`team_worker_id.in.(${teamWorkerIds.join(",")})`);

    const { data, error } = await supabase
      .from("vacation_requests")
      .select("user_id, team_worker_id, start_date, end_date")
      .eq("status", "approved")
      .or(subjectFilters.join(","))
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      user_id: string | null;
      team_worker_id: number | null;
      start_date: string;
      end_date: string;
    }>;
  },
});
