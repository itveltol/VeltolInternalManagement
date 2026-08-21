import type { ScheduleApiClient } from "../api/types";
import type { TeamsApiClient } from "@/features/teams/api/types";
import type { ScheduleEntry, TeamScheduleRow, WeekGrid } from "../types";

const WEEKDAY_COUNT = 6; // Monday..Saturday, matching the dispatch sheet

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

function memberName(member: { profile?: { first_name: string | null; last_name: string | null; email: string } }): string {
  const p = member.profile;
  if (!p) return "";
  const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return name || p.email;
}

export async function getWeekGrid(
  scheduleClient: ScheduleApiClient,
  teamsClient: TeamsApiClient,
  weekStart: string,
): Promise<WeekGrid> {
  const dates = weekDates(weekStart);
  const [teams, allMembers, { entries, notes }] = await Promise.all([
    teamsClient.getTeams(),
    teamsClient.getAllTeamMembers(),
    scheduleClient.getWeek(weekStart, dates[dates.length - 1]),
  ]);

  const entriesByTeam = new Map<number, ScheduleEntry[]>();
  for (const entry of entries) {
    const list = entriesByTeam.get(entry.team_id);
    if (list) list.push(entry);
    else entriesByTeam.set(entry.team_id, [entry]);
  }

  const membersByTeam = new Map<number, { id: string; name: string }[]>();
  for (const member of allMembers) {
    const list = membersByTeam.get(member.team_id) ?? [];
    list.push({ id: member.user_id, name: memberName(member) });
    membersByTeam.set(member.team_id, list);
  }

  const noteByTeam = new Map(notes.map((n) => [n.team_id, n.note]));

  const rows: TeamScheduleRow[] = teams.map((team) => {
    const teamEntries = entriesByTeam.get(team.id) ?? [];
    return {
      team_id: team.id,
      team_name: team.name,
      members: membersByTeam.get(team.id) ?? [],
      days: dates.map((date) => ({
        date,
        entries: teamEntries
          .filter((e) => e.work_date === date)
          .sort((a, b) => a.sort_order - b.sort_order),
      })),
      note: noteByTeam.get(team.id) ?? "",
    };
  });

  return { weekStart, rows };
}

export function nextSortOrderForCell(entries: ScheduleEntry[], teamId: number, workDate: string): number {
  const inCell = entries.filter((e) => e.team_id === teamId && e.work_date === workDate);
  if (inCell.length === 0) return 0;
  return Math.max(...inCell.map((e) => e.sort_order)) + 1;
}
