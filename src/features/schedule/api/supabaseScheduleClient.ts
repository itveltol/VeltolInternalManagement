import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ScheduleApiClient,
  CreateScheduleEntryPayload,
  UpdateScheduleEntryPayload,
} from "./types";
import type { ScheduleEntry, WeekNote } from "../types";

interface ScheduleEntryRow {
  id: number;
  team_id: number;
  work_date: string;
  project_id: number | null;
  label: string;
  color: string | null;
  sort_order: number;
  project: { id: number; name: string } | null;
}

function mapEntryRow(row: ScheduleEntryRow): ScheduleEntry {
  return {
    id: row.id,
    team_id: row.team_id,
    work_date: row.work_date,
    project_id: row.project_id,
    project: row.project,
    label: row.label,
    color: row.color,
    sort_order: row.sort_order,
  };
}

export const createSupabaseScheduleClient = (supabase: SupabaseClient): ScheduleApiClient => ({
  async getWeek(weekStart, weekEnd) {
    const [entriesRes, notesRes] = await Promise.all([
      supabase
        .from("team_schedule_entries")
        .select("id, team_id, work_date, project_id, label, color, sort_order, project:projects(id, name)")
        .gte("work_date", weekStart)
        .lte("work_date", weekEnd)
        .order("sort_order"),
      supabase
        .from("team_schedule_notes")
        .select("team_id, week_start, note")
        .eq("week_start", weekStart),
    ]);
    if (entriesRes.error) throw new Error(entriesRes.error.message);
    if (notesRes.error) throw new Error(notesRes.error.message);
    return {
      entries: ((entriesRes.data ?? []) as unknown as ScheduleEntryRow[]).map(mapEntryRow),
      notes: (notesRes.data ?? []) as WeekNote[],
    };
  },

  async createEntry(payload: CreateScheduleEntryPayload, userId: string) {
    const { data, error } = await supabase
      .from("team_schedule_entries")
      .insert({ ...payload, created_by: userId, updated_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateEntry(id, payload: UpdateScheduleEntryPayload, userId: string) {
    const { error } = await supabase
      .from("team_schedule_entries")
      .update({ ...payload, updated_by: userId })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteEntry(id) {
    const { error } = await supabase.from("team_schedule_entries").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async upsertWeekNote(teamId, weekStart, note) {
    const { error } = await supabase
      .from("team_schedule_notes")
      .upsert({ team_id: teamId, week_start: weekStart, note }, { onConflict: "team_id,week_start" });
    if (error) throw new Error(error.message);
  },
});
