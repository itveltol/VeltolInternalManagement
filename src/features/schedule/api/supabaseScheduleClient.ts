import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ScheduleApiClient,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
  AssignmentDayPayload,
  AssignmentMemberInput,
  RawScheduleAssignment,
  ScheduleAssignmentDayRow,
} from "./types";

const ASSIGNMENT_SELECT = `
  id, project_id, pm_id, sales_id, start_date, end_date, label, color,
  project:projects!project_id(id, name),
  pm:profiles!pm_id(id, first_name, last_name),
  sales:profiles!sales_id(id, first_name, last_name),
  members:schedule_assignment_members(
    profile_id, team_worker_id,
    profile:profiles!profile_id(id, first_name, last_name, email),
    team_worker:team_workers!team_worker_id(id, first_name, last_name)
  )
`;

async function insertMembers(supabase: SupabaseClient, assignmentId: number, members: AssignmentMemberInput[]) {
  if (members.length === 0) return;
  const { error } = await supabase.from("schedule_assignment_members").insert(
    members.map((m) => ({ assignment_id: assignmentId, profile_id: m.profile_id, team_worker_id: m.team_worker_id })),
  );
  if (error) throw new Error(error.message);
}

export const createSupabaseScheduleClient = (supabase: SupabaseClient): ScheduleApiClient => ({
  async getAssignmentsForRange(rangeStart, rangeEnd) {
    // Range-overlap match (not exact-date equality) — this is what lets a
    // multi-week assignment "continue" as the user pages forward: the same
    // row is re-fetched and clipped per visible week, never duplicated in storage.
    const { data, error } = await supabase
      .from("schedule_assignments")
      .select(ASSIGNMENT_SELECT)
      .lte("start_date", rangeEnd)
      .gte("end_date", rangeStart);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as RawScheduleAssignment[];
  },

  async getAssignmentById(id) {
    const { data, error } = await supabase
      .from("schedule_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? (data as unknown as RawScheduleAssignment) : null;
  },

  async getAssignmentDaysForAssignments(assignmentIds, rangeStart, rangeEnd) {
    if (assignmentIds.length === 0) return [];
    const { data, error } = await supabase
      .from("schedule_assignment_days")
      .select("assignment_id, work_date, delegated, plus_hours")
      .in("assignment_id", assignmentIds)
      .gte("work_date", rangeStart)
      .lte("work_date", rangeEnd);
    if (error) throw new Error(error.message);
    return (data ?? []) as ScheduleAssignmentDayRow[];
  },

  async createAssignment(payload: CreateAssignmentPayload, userId: string) {
    const { members, ...assignmentFields } = payload;
    const { data, error } = await supabase
      .from("schedule_assignments")
      .insert({ ...assignmentFields, created_by: userId, updated_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = (data as { id: number }).id;
    await insertMembers(supabase, id, members);
    return { id };
  },

  async updateAssignment(id, payload: UpdateAssignmentPayload, userId: string) {
    const { error } = await supabase
      .from("schedule_assignments")
      .update({ ...payload, updated_by: userId })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async replaceAssignmentMembers(assignmentId, members) {
    const { error: deleteError } = await supabase
      .from("schedule_assignment_members")
      .delete()
      .eq("assignment_id", assignmentId);
    if (deleteError) throw new Error(deleteError.message);
    await insertMembers(supabase, assignmentId, members);
  },

  async deleteAssignment(id) {
    const { error } = await supabase.from("schedule_assignments").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async pruneAssignmentDaysOutsideRange(assignmentId, start, end) {
    const { error } = await supabase
      .from("schedule_assignment_days")
      .delete()
      .eq("assignment_id", assignmentId)
      .or(`work_date.lt.${start},work_date.gt.${end}`);
    if (error) throw new Error(error.message);
  },

  async upsertAssignmentDay(assignmentId, workDate, payload: AssignmentDayPayload, userId: string) {
    const { error } = await supabase.from("schedule_assignment_days").upsert(
      {
        assignment_id: assignmentId,
        work_date: workDate,
        delegated: payload.delegated,
        plus_hours: payload.plus_hours,
        updated_by: userId,
      },
      { onConflict: "assignment_id,work_date" },
    );
    if (error) throw new Error(error.message);
  },
});
