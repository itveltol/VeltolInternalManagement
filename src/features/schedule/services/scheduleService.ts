import type { ScheduleApiClient, RawAssignmentMember, ScheduleAssignmentDayRow } from "../api/types";
import type { VacationApiClient } from "@/features/vacation/api/types";
import type { ScheduleAssignee, ScheduleAssignment, ScheduleProjectCard, ScheduleDayCard, ScheduleTeamRow, ScheduleRowGroup, WeekGrid, WorkerHoursSummary } from "../types";

const WEEKDAY_COUNT = 6; // Monday..Saturday, matching the dispatch sheet
const NORMAL_DAY_HOURS = 8;
const DELEGATION_DAY_HOURS = 12;

export function weekDates(weekStart: string): string[] {
  const start = new Date(`${weekStart}T00:00:00Z`);
  return Array.from({ length: WEEKDAY_COUNT }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function weekEnd(weekStart: string): string {
  const dates = weekDates(weekStart);
  return dates[dates.length - 1];
}

export function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fullName(p: { first_name: string | null; last_name: string | null } | null): string {
  if (!p) return "";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
}

/** Key used to match a member against its vacation ranges and team lookup entry — same convention as ScheduleAssignee.id. */
function memberKey(m: RawAssignmentMember): string {
  return m.profile_id ?? `worker:${m.team_worker_id}`;
}

function toAssignee(m: RawAssignmentMember): ScheduleAssignee {
  if (m.profile_id && m.profile) {
    return { id: m.profile_id, name: fullName(m.profile) || m.profile.email, kind: "profile" };
  }
  const w = m.team_worker!;
  return { id: `worker:${w.id}`, name: `${w.first_name} ${w.last_name ?? ""}`.trim(), kind: "worker" };
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function getWeekGrid(
  scheduleClient: ScheduleApiClient,
  vacationClient: VacationApiClient,
  weekStart: string,
): Promise<WeekGrid> {
  const dates = weekDates(weekStart);
  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  const rawAssignments = await scheduleClient.getAssignmentsForRange(rangeStart, rangeEnd);

  const allMembers = rawAssignments.flatMap((a) => a.members);
  const profileIds = [...new Set(allMembers.map((m) => m.profile_id).filter((x): x is string => Boolean(x)))];
  const workerIds = [...new Set(allMembers.map((m) => m.team_worker_id).filter((x): x is number => Boolean(x)))];

  const [dayRows, vacations] = await Promise.all([
    scheduleClient.getAssignmentDaysForAssignments(rawAssignments.map((a) => a.id), rangeStart, rangeEnd),
    vacationClient.getApprovedOverlapping(profileIds, workerIds, rangeStart, rangeEnd),
  ]);

  const daysByAssignment = new Map<number, ScheduleAssignmentDayRow[]>();
  for (const d of dayRows) {
    const list = daysByAssignment.get(d.assignment_id) ?? [];
    list.push(d);
    daysByAssignment.set(d.assignment_id, list);
  }

  const vacationRangesBySubject = new Map<string, Array<{ start: string; end: string }>>();
  for (const v of vacations) {
    const key = v.user_id ?? `worker:${v.team_worker_id}`;
    const list = vacationRangesBySubject.get(key) ?? [];
    list.push({ start: v.start_date, end: v.end_date });
    vacationRangesBySubject.set(key, list);
  }

  function isOnVacation(key: string, date: string): boolean {
    const ranges = vacationRangesBySubject.get(key) ?? [];
    return ranges.some((r) => date >= r.start && date <= r.end);
  }

  const cardsByProject = new Map<number | null, ScheduleProjectCard>();
  for (const a of rawAssignments) {
    const card = cardsByProject.get(a.project_id) ?? {
      project_id: a.project_id,
      project_name: a.project?.name ?? null,
      assignments: [],
    };
    const savedDays = new Map((daysByAssignment.get(a.id) ?? []).map((d) => [d.work_date, d]));
    const assignees = a.members.map(toAssignee);

    const assignment: ScheduleAssignment = {
      id: a.id,
      project_id: a.project_id,
      pm: a.pm_id && a.pm ? { id: a.pm_id, name: fullName(a.pm) } : null,
      sales: a.sales_id && a.sales ? { id: a.sales_id, name: fullName(a.sales) } : null,
      assignees,
      start_date: a.start_date,
      end_date: a.end_date,
      label: a.label,
      color: a.color,
      days: dates
        .filter((date) => date >= a.start_date && date <= a.end_date)
        .map((date) => ({
          work_date: date,
          delegated: savedDays.get(date)?.delegated ?? false,
          plus_hours: savedDays.get(date)?.plus_hours ?? 0,
          assignees: a.members.map((m, i) => ({
            assignee: assignees[i],
            onVacation: isOnVacation(memberKey(m), date),
          })),
        })),
    };
    card.assignments.push(assignment);
    cardsByProject.set(a.project_id, card);
  }

  return { weekStart, weekEnd: rangeEnd, cards: [...cardsByProject.values()] };
}

export interface ConflictSubject {
  profileId: string | null;
  teamWorkerId: number | null;
}

/** Assignment-time check: does this subject already have approved leave overlapping [start, end]? */
export async function findVacationConflict(
  vacationClient: VacationApiClient,
  subject: ConflictSubject,
  start: string,
  end: string,
): Promise<{ start_date: string; end_date: string } | null> {
  const profileIds = subject.profileId ? [subject.profileId] : [];
  const workerIds = subject.teamWorkerId ? [subject.teamWorkerId] : [];
  const overlapping = await vacationClient.getApprovedOverlapping(profileIds, workerIds, start, end);
  return overlapping[0] ?? null;
}

/** Runs findVacationConflict across every assignee of a multi-person card; returns the first conflict found, if any. */
export async function findAnyVacationConflict(
  vacationClient: VacationApiClient,
  subjects: ConflictSubject[],
  start: string,
  end: string,
): Promise<{ start_date: string; end_date: string } | null> {
  for (const subject of subjects) {
    const conflict = await findVacationConflict(vacationClient, subject, start, end);
    if (conflict) return conflict;
  }
  return null;
}

export interface TeamLookupEntry {
  team_id: number;
  team_name: string;
}

/**
 * Resolves which row a card's group of assignees belongs under: the one real
 * team every assignee shares, or the fixed "Custom" catch-all when they don't
 * all belong to exactly one common team (including a lone assignee with no
 * team at all).
 */
function resolveRowGroup(
  assignees: ScheduleAssignee[],
  teamByAssigneeId: ReadonlyMap<string, TeamLookupEntry>,
): ScheduleRowGroup {
  const teams = assignees.map((a) => teamByAssigneeId.get(a.id));
  if (teams.some((t) => t === undefined)) return { kind: "custom" };
  const uniqueTeamIds = new Set(teams.map((t) => t!.team_id));
  if (uniqueTeamIds.size !== 1) return { kind: "custom" };
  const team = teams[0]!;
  return { kind: "team", team_id: team.team_id, team_name: team.team_name };
}

/** Flattens project-grouped cards into a flat list of per-day card instances — one ScheduleDayCard per (assignment, visible day) pair. */
function toDayCards(
  cards: ScheduleProjectCard[],
  teamByAssigneeId: ReadonlyMap<string, TeamLookupEntry>,
): ScheduleDayCard[] {
  const out: ScheduleDayCard[] = [];
  for (const projectCard of cards) {
    for (const assignment of projectCard.assignments) {
      const rowGroup = resolveRowGroup(assignment.assignees, teamByAssigneeId);
      for (const day of assignment.days) {
        out.push({
          assignment_id: assignment.id,
          project_id: projectCard.project_id,
          project_name: projectCard.project_name,
          pm: assignment.pm,
          sales: assignment.sales,
          rowGroup,
          label: assignment.label,
          color: assignment.color,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
          day,
        });
      }
    }
  }
  return out;
}

/**
 * Groups project-grouped cards into team rows x day columns, matching the
 * original team-based calendar's structure. A card's row is the one real
 * team every assignee shares (see resolveRowGroup), or the fixed "Custom"
 * row when they don't.
 */
export function toTeamRows(
  cards: ScheduleProjectCard[],
  dates: string[],
  teamByAssigneeId: ReadonlyMap<string, TeamLookupEntry>,
  allTeams: TeamLookupEntry[],
  customLabel: string,
): ScheduleTeamRow[] {
  const dayCards = toDayCards(cards, teamByAssigneeId);

  const CUSTOM_KEY = -1;
  const cardsByTeamAndDate = new Map<number, Map<string, ScheduleDayCard[]>>();
  function bucket(teamId: number): Map<string, ScheduleDayCard[]> {
    let m = cardsByTeamAndDate.get(teamId);
    if (!m) {
      m = new Map(dates.map((d) => [d, []]));
      cardsByTeamAndDate.set(teamId, m);
    }
    return m;
  }

  for (const card of dayCards) {
    const teamId = card.rowGroup.kind === "team" ? card.rowGroup.team_id : CUSTOM_KEY;
    bucket(teamId).get(card.day.work_date)?.push(card);
  }

  const rows: ScheduleTeamRow[] = allTeams.map((team) => ({
    team_id: team.team_id,
    team_name: team.team_name,
    days: dates.map((date) => ({ date, cards: cardsByTeamAndDate.get(team.team_id)?.get(date) ?? [] })),
  }));

  const customBucket = cardsByTeamAndDate.get(CUSTOM_KEY);
  const hasCustom = customBucket && [...customBucket.values()].some((list) => list.length > 0);
  if (hasCustom) {
    rows.push({
      team_id: null,
      team_name: customLabel,
      days: dates.map((date) => ({ date, cards: customBucket?.get(date) ?? [] })),
    });
  }

  return rows;
}

interface PersonDateAggregate {
  assignee: ScheduleAssignee;
  delegated: boolean;
  plusHours: number;
}

/**
 * Aggregates a week's assignment cards into per-person worked-hours totals.
 * A person's day counts once (8h normal, 12h if any of their cards that day
 * is a delegation day — not summed per card), with plus_hours summed across
 * all of their cards that day. Days the person is on approved leave don't count.
 */
export function summarizeWorkerHours(cards: ScheduleProjectCard[]): WorkerHoursSummary[] {
  const byPersonAndDate = new Map<string, Map<string, PersonDateAggregate>>();

  for (const projectCard of cards) {
    for (const assignment of projectCard.assignments) {
      for (const day of assignment.days) {
        for (const { assignee, onVacation } of day.assignees) {
          if (onVacation) continue;
          const byDate = byPersonAndDate.get(assignee.id) ?? new Map<string, PersonDateAggregate>();
          const existing = byDate.get(day.work_date);
          byDate.set(day.work_date, {
            assignee,
            delegated: (existing?.delegated ?? false) || day.delegated,
            plusHours: (existing?.plusHours ?? 0) + day.plus_hours,
          });
          byPersonAndDate.set(assignee.id, byDate);
        }
      }
    }
  }

  const summaries: WorkerHoursSummary[] = [];
  for (const byDate of byPersonAndDate.values()) {
    let assignee: ScheduleAssignee | null = null;
    let normalDays = 0;
    let delegationDays = 0;
    let plusHours = 0;
    for (const entry of byDate.values()) {
      assignee = entry.assignee;
      if (entry.delegated) delegationDays += 1;
      else normalDays += 1;
      plusHours += entry.plusHours;
    }
    const baseHours = normalDays * NORMAL_DAY_HOURS + delegationDays * DELEGATION_DAY_HOURS;
    summaries.push({
      assignee: assignee!,
      normalDays,
      delegationDays,
      baseHours,
      plusHours,
      totalHours: baseHours + plusHours,
    });
  }

  return summaries.sort((a, b) => a.assignee.name.localeCompare(b.assignee.name));
}

/** Vacation-approval-time check: does this subject have any schedule assignments overlapping [start, end]? */
export async function findAssignmentConflicts(
  scheduleClient: ScheduleApiClient,
  subject: ConflictSubject,
  start: string,
  end: string,
): Promise<Array<{ projectId: number | null; projectName: string; pmId: string | null }>> {
  const raw = await scheduleClient.getAssignmentsForRange(start, end);
  return raw
    .filter((a) =>
      a.members.some(
        (m) =>
          (subject.profileId && m.profile_id === subject.profileId) ||
          (subject.teamWorkerId && m.team_worker_id === subject.teamWorkerId),
      ),
    )
    .map((a) => ({ projectId: a.project_id, projectName: a.project?.name ?? a.label, pmId: a.pm_id }));
}
