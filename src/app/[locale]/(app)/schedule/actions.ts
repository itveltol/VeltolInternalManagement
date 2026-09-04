"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser, getUserProfileRole } from "@/core/supabase/session";
import { createAdminClient } from "@/core/supabase/admin";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { createSupabaseScheduleClient } from "@/features/schedule/api/supabaseScheduleClient";
import { createSupabaseTeamsClient } from "@/features/teams/api/supabaseTeamsClient";
import { createSupabaseVacationClient } from "@/features/vacation/api/supabaseVacationClient";
import { createSupabaseProjectsClient } from "@/features/projects/api/supabaseProjectsClient";
import { createSupabaseCommsClient } from "@/features/comms/api/supabaseCommsClient";
import * as scheduleService from "@/features/schedule/services/scheduleService";
import type { TeamLookupEntry } from "@/features/schedule/services/scheduleService";
import type { WeekGrid, ScheduleProjectOption, ScheduleAssignee, PmColorEntry } from "@/features/schedule/types";
import type { CreateAssignmentPayload, UpdateAssignmentPayload, AssignmentDayPayload, AssignmentMemberInput, RawAssignmentMember } from "@/features/schedule/api/types";
import type { RosterRow } from "@/features/schedule/components/TeamRosterTable";

export type ActionState = {
  error?: string;
  success?: string;
  warning?: { conflictStart: string; conflictEnd: string };
  doubleBooking?: DoubleBookingConflictView[];
} | null;

export interface DoubleBookingConflictView {
  subjectKey: string; // profile uuid, or `worker:<id>` — matches ScheduleAssignee.id
  assigneeName: string;
  assignmentId: number;
  projectName: string;
  start_date: string;
  end_date: string;
}

export interface DoubleBookingResolution {
  subjectKey: string;
  assignmentId: number;
  choice: "keepHere" | "keepOther";
}

async function getSchedulePath() {
  const locale = await getLocale();
  return `/${locale}/schedule`;
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

function mapError(e: unknown): ActionState {
  if (e instanceof Error && e.message === "Forbidden") return { error: "errorNotAllowed" };
  return { error: "errorGeneric" };
}

// notifications has no insert policy for regular users, so this must go
// through the admin client. Never let a notification failure block the
// assignment save it's attached to.
async function notifyScheduleConflictOnAssign(
  actorId: string,
  projectId: number | null,
  projectName: string,
  workerName: string,
  conflict: { start_date: string; end_date: string },
) {
  try {
    const commsClient = createSupabaseCommsClient(createAdminClient());
    await commsClient.createNotification({
      profileId: actorId,
      type: "schedule_conflict",
      projectId,
      payload: {
        projectName,
        workerName,
        conflictStart: conflict.start_date,
        conflictEnd: conflict.end_date,
        kind: "assign_over_vacation",
        snippet: `${workerName} is on approved leave ${conflict.start_date} – ${conflict.end_date}`,
      },
      href: `/schedule?week=${scheduleService.mondayOf(new Date(conflict.start_date))}`,
    });
  } catch (e) {
    console.error("notifyScheduleConflictOnAssign failed:", e);
  }
}

async function getTeamsRosterData(supabase: SupabaseClient) {
  const teamsClient = createSupabaseTeamsClient(supabase);
  const [teams, allMembers, allWorkers] = await Promise.all([
    teamsClient.getTeams(),
    teamsClient.getAllTeamMembers(),
    teamsClient.getAllTeamWorkers(),
  ]);
  return { teams, allMembers, allWorkers };
}

export async function getWeekGrid(weekStart: string): Promise<WeekGrid> {
  const { supabase } = await requireAuth();
  const scheduleClient = createSupabaseScheduleClient(supabase);
  const vacationClient = createSupabaseVacationClient(supabase);
  return scheduleService.getWeekGrid(scheduleClient, vacationClient, weekStart);
}

export async function searchProjectsAction(query: string): Promise<ScheduleProjectOption[]> {
  const { supabase } = await requireAuth();
  let request = supabase
    .from("projects")
    .select(
      "id, name, manager_id, manager:profiles!manager_id(id, first_name, last_name), sales_id, sales:profiles!sales_id(id, first_name, last_name)",
    )
    .order("name")
    .limit(20);
  if (query.trim() !== "") {
    request = request.ilike("name", `%${query.trim()}%`);
  }
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  type Row = {
    id: number;
    name: string;
    manager_id: string | null;
    manager: { id: string; first_name: string | null; last_name: string | null } | null;
    sales_id: string | null;
    sales: { id: string; first_name: string | null; last_name: string | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((p) => ({
    id: p.id,
    name: p.name,
    manager: p.manager_id && p.manager
      ? { id: p.manager.id, name: [p.manager.first_name, p.manager.last_name].filter(Boolean).join(" ") || p.manager.id }
      : null,
    sales: p.sales_id && p.sales
      ? { id: p.sales.id, name: [p.sales.first_name, p.sales.last_name].filter(Boolean).join(" ") || p.sales.id }
      : null,
  }));
}

export async function searchProjectManagersAction(query: string): Promise<ScheduleAssignee[]> {
  const { supabase } = await requireAuth();
  const client = createSupabaseProjectsClient(supabase);
  const managers = await client.getProjectManagers();
  const needle = query.trim().toLowerCase();
  const all: ScheduleAssignee[] = managers.map((m) => ({
    id: m.id,
    name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.id,
    kind: "profile",
  }));
  if (!needle) return all;
  return all.filter((a) => a.name.toLowerCase().includes(needle));
}

export async function getPmColorsAction(): Promise<PmColorEntry[]> {
  const { supabase } = await requireAuth();
  const projectsClient = createSupabaseProjectsClient(supabase);
  const [managers, { data: colorRows, error }] = await Promise.all([
    projectsClient.getProjectManagers(),
    supabase.from("pm_colors").select("pm_id, color"),
  ]);
  if (error) throw new Error(error.message);

  const colorByPmId = new Map((colorRows ?? []).map((r) => [r.pm_id as string, r.color as string]));
  return managers.map((m) => ({
    pm_id: m.id,
    name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.id,
    color: colorByPmId.get(m.id) ?? null,
  }));
}

export async function setPmColorAction(pmId: string, color: string): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const { error } = await supabase
      .from("pm_colors")
      .upsert({ pm_id: pmId, color, updated_by: user.id }, { onConflict: "pm_id" });
    if (error) throw new Error(error.message);
    revalidatePath(await getSchedulePath());
    return { success: "entrySaved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function getTeamRoster(): Promise<RosterRow[]> {
  const { supabase } = await requireAuth();
  const { teams, allMembers, allWorkers } = await getTeamsRosterData(supabase);

  const membersByTeam = new Map<number, RosterRow["members"]>();
  for (const member of allMembers) {
    const list = membersByTeam.get(member.team_id) ?? [];
    const p = member.profile;
    const name = p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : "";
    list.push({ id: member.user_id, name, kind: "profile" });
    membersByTeam.set(member.team_id, list);
  }
  for (const worker of allWorkers) {
    if (worker.team_id === null) continue;
    const list = membersByTeam.get(worker.team_id) ?? [];
    list.push({ id: `worker:${worker.id}`, name: `${worker.first_name} ${worker.last_name ?? ""}`.trim(), kind: "worker" });
    membersByTeam.set(worker.team_id, list);
  }

  return teams.map((team) => ({
    team_id: team.id,
    team_name: team.name,
    members: membersByTeam.get(team.id) ?? [],
  }));
}

/** Team lookup (assignee id -> team) plus the full team list, for grouping the calendar grid into team rows client-side. */
export async function getTeamLookup(): Promise<{ byAssigneeId: Record<string, TeamLookupEntry>; teams: TeamLookupEntry[]; customLabel: string }> {
  const { supabase } = await requireAuth();
  const { teams, allMembers, allWorkers } = await getTeamsRosterData(supabase);

  const byAssigneeId: Record<string, TeamLookupEntry> = {};
  for (const member of allMembers) {
    if (byAssigneeId[member.user_id]) continue;
    const team = teams.find((t) => t.id === member.team_id);
    if (team) byAssigneeId[member.user_id] = { team_id: team.id, team_name: team.name };
  }
  for (const worker of allWorkers) {
    const team = teams.find((t) => t.id === worker.team_id);
    if (team) byAssigneeId[`worker:${worker.id}`] = { team_id: team.id, team_name: team.name };
  }

  const t = await getTranslations({ locale: await getLocale(), namespace: "schedule" });
  return {
    byAssigneeId,
    teams: teams.map((t) => ({ team_id: t.id, team_name: t.name })),
    customLabel: t("roster.custom"),
  };
}

export async function searchAssigneesAction(query: string): Promise<ScheduleAssignee[]> {
  const { supabase } = await requireAuth();
  const teamsClient = createSupabaseTeamsClient(supabase);
  const [managers, workers] = await Promise.all([
    createSupabaseProjectsClient(supabase).getProjectManagers(),
    teamsClient.getAllTeamWorkers(),
  ]);
  const needle = query.trim().toLowerCase();

  const profileAssignees: ScheduleAssignee[] = managers.map((m) => ({
    id: m.id,
    name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.id,
    kind: "profile",
  }));
  const workerAssignees: ScheduleAssignee[] = workers
    .filter((w) => w.active)
    .map((w) => ({
      id: `worker:${w.id}`,
      name: `${w.first_name} ${w.last_name ?? ""}`.trim(),
      kind: "worker",
    }));

  const all = [...profileAssignees, ...workerAssignees];
  if (!needle) return all;
  return all.filter((a) => a.name.toLowerCase().includes(needle));
}

function parseSubjects(members: AssignmentMemberInput[]) {
  return members.map((m) => ({ profileId: m.profile_id, teamWorkerId: m.team_worker_id }));
}

function subjectKeyOf(m: { profileId: string | null; teamWorkerId: number | null }): string {
  return m.profileId ?? `worker:${m.teamWorkerId}`;
}

function toDoubleBookingView(conflicts: Awaited<ReturnType<typeof scheduleService.findDoubleBookingConflicts>>): DoubleBookingConflictView[] {
  return conflicts.map((c) => ({
    subjectKey: subjectKeyOf(c.subject),
    assigneeName: c.assigneeName,
    assignmentId: c.assignmentId,
    projectName: c.projectName,
    start_date: c.start_date,
    end_date: c.end_date,
  }));
}

/**
 * Removes one member from an assignment for the given overlapping date range,
 * while every *other* member stays assigned for the assignment's full original
 * range — used when a double-booking is resolved by keeping the worker on the
 * *new* assignment instead. Since membership isn't tracked per-day, the only
 * way to drop one member for a sub-range is to split the assignment: the
 * portion outside the conflicting range keeps the original full member list,
 * and a new sibling assignment covers the conflicting range with that member
 * excluded (dropped entirely if they were the only member there).
 */
async function removeMemberFromAssignmentForRange(
  supabase: SupabaseClient,
  userId: string,
  assignmentId: number,
  subject: AssignmentMemberInput,
  rangeStart: string,
  rangeEnd: string,
) {
  const client = createSupabaseScheduleClient(supabase);
  const assignment = await client.getAssignmentById(assignmentId);
  if (!assignment) return;

  const clippedStart = rangeStart > assignment.start_date ? rangeStart : assignment.start_date;
  const clippedEnd = rangeEnd < assignment.end_date ? rangeEnd : assignment.end_date;
  if (clippedStart > clippedEnd) return;

  const baseFields = {
    project_id: assignment.project_id,
    pm_id: assignment.pm_id,
    sales_id: assignment.sales_id,
    label: assignment.label,
    color: assignment.color,
  };
  const allMembers = assignment.members.map((m) => ({ profile_id: m.profile_id, team_worker_id: m.team_worker_id }));
  const membersWithoutSubject = allMembers.filter(
    (m) => !(m.profile_id === subject.profile_id && m.team_worker_id === subject.team_worker_id),
  );

  async function createConflictPiece(start: string, end: string) {
    if (membersWithoutSubject.length === 0) return; // nothing left to schedule for these days
    const days = await client.getAssignmentDaysForAssignments([assignmentId], start, end);
    const { id } = await client.createAssignment({ members: membersWithoutSubject, start_date: start, end_date: end, ...baseFields }, userId);
    for (const day of days) {
      await client.upsertAssignmentDay(id, day.work_date, { delegated: day.delegated, plus_hours: day.plus_hours }, userId);
    }
  }

  if (clippedStart === assignment.start_date && clippedEnd === assignment.end_date) {
    // The conflicting range covers the whole assignment — just drop the member from it (all days shared its dates).
    if (membersWithoutSubject.length === 0) await client.deleteAssignment(assignmentId);
    else await client.replaceAssignmentMembers(assignmentId, membersWithoutSubject);
    return;
  }

  if (clippedStart === assignment.start_date) {
    // Conflict eats the head: shrink the original to the tail (full roster kept), spin off a head piece without the subject.
    const newStart = scheduleService.addDays(clippedEnd, 1);
    await client.updateAssignment(assignmentId, { ...baseFields, start_date: newStart, end_date: assignment.end_date }, userId);
    await client.pruneAssignmentDaysOutsideRange(assignmentId, newStart, assignment.end_date);
    await createConflictPiece(clippedStart, clippedEnd);
    return;
  }

  if (clippedEnd === assignment.end_date) {
    // Conflict eats the tail: shrink the original to the head (full roster kept), spin off a tail piece without the subject.
    const newEnd = scheduleService.addDays(clippedStart, -1);
    await client.updateAssignment(assignmentId, { ...baseFields, start_date: assignment.start_date, end_date: newEnd }, userId);
    await client.pruneAssignmentDaysOutsideRange(assignmentId, assignment.start_date, newEnd);
    await createConflictPiece(clippedStart, clippedEnd);
    return;
  }

  // Conflict is strictly inside the range: shrink the original to the head (full roster kept),
  // spin off a middle piece without the subject, and a tail piece with the full roster restored.
  const beforeEnd = scheduleService.addDays(clippedStart, -1);
  const afterStart = scheduleService.addDays(clippedEnd, 1);
  const tailDays = await client.getAssignmentDaysForAssignments([assignmentId], afterStart, assignment.end_date);

  await client.updateAssignment(assignmentId, { ...baseFields, start_date: assignment.start_date, end_date: beforeEnd }, userId);
  await client.pruneAssignmentDaysOutsideRange(assignmentId, assignment.start_date, beforeEnd);

  await createConflictPiece(clippedStart, clippedEnd);

  const { id: tailId } = await client.createAssignment(
    { members: allMembers, start_date: afterStart, end_date: assignment.end_date, ...baseFields },
    userId,
  );
  for (const day of tailDays) {
    await client.upsertAssignmentDay(tailId, day.work_date, { delegated: day.delegated, plus_hours: day.plus_hours }, userId);
  }
}

/**
 * Resolves member display names straight off the assignment's own joined
 * profile/team_worker rows — unlike searchAssigneesAction, this doesn't drop
 * inactive workers or non-PM profiles, since those are valid assignees too.
 */
function resolveMemberNames(members: RawAssignmentMember[]): string {
  return members
    .map((m) => {
      if (m.profile) return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || m.profile.email;
      if (m.team_worker) return `${m.team_worker.first_name} ${m.team_worker.last_name ?? ""}`.trim();
      return null;
    })
    .filter((n): n is string => Boolean(n))
    .join(", ");
}

/** Applies user-chosen resolutions: drops "keepOther" members from the new payload, and trims the other assignment's range for "keepHere" members. Returns the possibly-narrowed member list to save. */
async function applyDoubleBookingResolutions(
  supabase: SupabaseClient,
  userId: string,
  members: AssignmentMemberInput[],
  start: string,
  end: string,
  resolutions: DoubleBookingResolution[],
): Promise<AssignmentMemberInput[]> {
  let nextMembers = members;
  for (const resolution of resolutions) {
    if (resolution.choice === "keepHere") {
      const subject = members.find((m) => subjectKeyOf({ profileId: m.profile_id, teamWorkerId: m.team_worker_id }) === resolution.subjectKey);
      if (!subject) continue;
      await removeMemberFromAssignmentForRange(supabase, userId, resolution.assignmentId, subject, start, end);
    } else {
      nextMembers = nextMembers.filter(
        (m) => subjectKeyOf({ profileId: m.profile_id, teamWorkerId: m.team_worker_id }) !== resolution.subjectKey,
      );
    }
  }
  return nextMembers;
}

export async function createAssignmentAction(
  payload: CreateAssignmentPayload,
  resolutions?: DoubleBookingResolution[],
): Promise<ActionState> {
  try {
    if (!payload.project_id && !payload.label.trim()) return { error: "errorProjectOrLabelRequired" };

    const { supabase, user } = await requireMutator();
    const scheduleClient = createSupabaseScheduleClient(supabase);
    const vacationClient = createSupabaseVacationClient(supabase);

    if (!resolutions) {
      const doubleBooking = await scheduleService.findDoubleBookingConflicts(
        scheduleClient,
        parseSubjects(payload.members),
        payload.start_date,
        payload.end_date,
        null,
      );
      if (doubleBooking.length > 0) {
        return { doubleBooking: toDoubleBookingView(doubleBooking) };
      }
    }

    const members = resolutions
      ? await applyDoubleBookingResolutions(supabase, user.id, payload.members, payload.start_date, payload.end_date, resolutions)
      : payload.members;

    const conflict = await scheduleService.findAnyVacationConflict(
      vacationClient,
      parseSubjects(members),
      payload.start_date,
      payload.end_date,
    );

    const { id } = await scheduleClient.createAssignment({ ...payload, members }, user.id);
    revalidatePath(await getSchedulePath());

    if (conflict) {
      const projectsClient = createSupabaseProjectsClient(supabase);
      const [project, created] = await Promise.all([
        payload.project_id ? projectsClient.getProjectById(payload.project_id) : Promise.resolve(null),
        scheduleClient.getAssignmentById(id),
      ]);
      await notifyScheduleConflictOnAssign(
        user.id,
        payload.project_id,
        project?.name ?? payload.label,
        resolveMemberNames(created?.members ?? []),
        conflict,
      );
      return { success: "entrySaved", warning: { conflictStart: conflict.start_date, conflictEnd: conflict.end_date } };
    }

    return { success: "entrySaved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function updateAssignmentAction(
  id: number,
  members: AssignmentMemberInput[],
  payload: UpdateAssignmentPayload,
  resolutions?: DoubleBookingResolution[],
): Promise<ActionState> {
  try {
    if (!payload.project_id && !payload.label.trim()) return { error: "errorProjectOrLabelRequired" };

    const { supabase, user } = await requireMutator();
    const scheduleClient = createSupabaseScheduleClient(supabase);
    const vacationClient = createSupabaseVacationClient(supabase);

    if (!resolutions) {
      const doubleBooking = await scheduleService.findDoubleBookingConflicts(
        scheduleClient,
        parseSubjects(members),
        payload.start_date,
        payload.end_date,
        id,
      );
      if (doubleBooking.length > 0) {
        return { doubleBooking: toDoubleBookingView(doubleBooking) };
      }
    }

    const resolvedMembers = resolutions
      ? await applyDoubleBookingResolutions(supabase, user.id, members, payload.start_date, payload.end_date, resolutions)
      : members;

    const conflict = await scheduleService.findAnyVacationConflict(
      vacationClient,
      parseSubjects(resolvedMembers),
      payload.start_date,
      payload.end_date,
    );

    await scheduleClient.updateAssignment(id, payload, user.id);
    await scheduleClient.replaceAssignmentMembers(id, resolvedMembers);
    await scheduleClient.pruneAssignmentDaysOutsideRange(id, payload.start_date, payload.end_date);
    revalidatePath(await getSchedulePath());

    if (conflict) {
      return { success: "entrySaved", warning: { conflictStart: conflict.start_date, conflictEnd: conflict.end_date } };
    }
    return { success: "entrySaved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function deleteAssignmentAction(id: number): Promise<ActionState> {
  try {
    const { supabase } = await requireMutator();
    const client = createSupabaseScheduleClient(supabase);
    await client.deleteAssignment(id);
    revalidatePath(await getSchedulePath());
    return { success: "entryDeleted" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function removeAssignmentFromDayAction(assignmentId: number, date: string): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseScheduleClient(supabase);
    const assignment = await client.getAssignmentById(assignmentId);
    if (!assignment) return { error: "errorGeneric" };

    const baseFields = {
      project_id: assignment.project_id,
      pm_id: assignment.pm_id,
      sales_id: assignment.sales_id,
      label: assignment.label,
      color: assignment.color,
    };

    if (assignment.start_date === date && assignment.end_date === date) {
      await client.deleteAssignment(assignmentId);
    } else if (date === assignment.start_date) {
      const newStart = scheduleService.addDays(date, 1);
      await client.updateAssignment(assignmentId, { ...baseFields, start_date: newStart, end_date: assignment.end_date }, user.id);
      await client.pruneAssignmentDaysOutsideRange(assignmentId, newStart, assignment.end_date);
    } else if (date === assignment.end_date) {
      const newEnd = scheduleService.addDays(date, -1);
      await client.updateAssignment(assignmentId, { ...baseFields, start_date: assignment.start_date, end_date: newEnd }, user.id);
      await client.pruneAssignmentDaysOutsideRange(assignmentId, assignment.start_date, newEnd);
    } else {
      // Middle day removed — split into two assignments, same project/assignee/label/color.
      const beforeEnd = scheduleService.addDays(date, -1);
      const afterStart = scheduleService.addDays(date, 1);
      const members = assignment.members.map((m) => ({ profile_id: m.profile_id, team_worker_id: m.team_worker_id }));

      // Fetch the tail's per-day delegation/hours rows before pruning them off the
      // original assignment, so they can be carried over to the new tail assignment
      // instead of being silently lost.
      const tailDays = await client.getAssignmentDaysForAssignments([assignmentId], afterStart, assignment.end_date);

      await client.updateAssignment(assignmentId, { ...baseFields, start_date: assignment.start_date, end_date: beforeEnd }, user.id);
      await client.pruneAssignmentDaysOutsideRange(assignmentId, assignment.start_date, beforeEnd);

      const conflict = await scheduleService.findAnyVacationConflict(
        createSupabaseVacationClient(supabase),
        parseSubjects(members),
        afterStart,
        assignment.end_date,
      );

      const { id: tailId } = await client.createAssignment(
        { members, start_date: afterStart, end_date: assignment.end_date, ...baseFields },
        user.id,
      );
      for (const day of tailDays) {
        await client.upsertAssignmentDay(tailId, day.work_date, { delegated: day.delegated, plus_hours: day.plus_hours }, user.id);
      }

      if (conflict) {
        const projectsClient = createSupabaseProjectsClient(supabase);
        const project = assignment.project_id ? await projectsClient.getProjectById(assignment.project_id) : null;
        await notifyScheduleConflictOnAssign(
          user.id,
          assignment.project_id,
          project?.name ?? assignment.label,
          resolveMemberNames(assignment.members),
          conflict,
        );
      }
    }

    revalidatePath(await getSchedulePath());
    return { success: "entryDeleted" };
  } catch (e: unknown) {
    return mapError(e);
  }
}

export async function upsertAssignmentDayAction(
  assignmentId: number,
  workDate: string,
  payload: AssignmentDayPayload,
): Promise<ActionState> {
  try {
    const { supabase, user } = await requireMutator();
    const client = createSupabaseScheduleClient(supabase);
    await client.upsertAssignmentDay(assignmentId, workDate, payload, user.id);
    revalidatePath(await getSchedulePath());
    return { success: "entrySaved" };
  } catch (e: unknown) {
    return mapError(e);
  }
}
