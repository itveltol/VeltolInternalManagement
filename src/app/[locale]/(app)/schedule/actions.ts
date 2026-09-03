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

export type ActionState = { error?: string; success?: string; warning?: { conflictStart: string; conflictEnd: string } } | null;

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

export async function createAssignmentAction(payload: CreateAssignmentPayload): Promise<ActionState> {
  try {
    if (!payload.project_id && !payload.label.trim()) return { error: "errorProjectOrLabelRequired" };

    const { supabase, user } = await requireMutator();
    const scheduleClient = createSupabaseScheduleClient(supabase);
    const vacationClient = createSupabaseVacationClient(supabase);

    const conflict = await scheduleService.findAnyVacationConflict(
      vacationClient,
      parseSubjects(payload.members),
      payload.start_date,
      payload.end_date,
    );

    const { id } = await scheduleClient.createAssignment(payload, user.id);
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
): Promise<ActionState> {
  try {
    if (!payload.project_id && !payload.label.trim()) return { error: "errorProjectOrLabelRequired" };

    const { supabase, user } = await requireMutator();
    const scheduleClient = createSupabaseScheduleClient(supabase);
    const vacationClient = createSupabaseVacationClient(supabase);

    const conflict = await scheduleService.findAnyVacationConflict(
      vacationClient,
      parseSubjects(members),
      payload.start_date,
      payload.end_date,
    );

    await scheduleClient.updateAssignment(id, payload, user.id);
    await scheduleClient.replaceAssignmentMembers(id, members);
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
