import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChecklistApiClient,
  UpsertChecklistItemPayload,
  LogTodayPayload,
  ScheduleItemPayload,
  CreateCustomTaskPayload,
} from "./types";
import type { ChecklistItemRecord, DailyLogRecord } from "@/features/projects/checklists/types";

const CUSTOM_ITEM_NUMBER_MIN = 44;
const CUSTOM_ITEM_NUMBER_MAX = 100;

export const createSupabaseChecklistClient = (supabase: SupabaseClient): ChecklistApiClient => ({
  async getChecklistRecords(projectId) {
    const { data, error } = await supabase
      .from("project_checklist_items")
      .select("*, team:teams!team_id(id, name)")
      .eq("project_id", projectId)
      .order("item_number");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ChecklistItemRecord[];
  },

  async upsertChecklistItem({ projectId, itemNumber, plan_total, zile, notes }: UpsertChecklistItemPayload) {
    const { error } = await supabase
      .from("project_checklist_items")
      .upsert(
        { project_id: projectId, item_number: itemNumber, plan_total, zile, notes },
        { onConflict: "project_id,item_number" }
      );
    if (error) throw new Error(error.message);
  },

  async logTodayRealizat({ itemId, logDate, realizat }: LogTodayPayload) {
    const { error } = await supabase
      .from("checklist_daily_log")
      .upsert(
        { item_id: itemId, log_date: logDate, realizat },
        { onConflict: "item_id,log_date" }
      );
    if (error) throw new Error(error.message);
  },

  async recomputeRealizat(itemId) {
    const { data: logRows, error: sumError } = await supabase
      .from("checklist_daily_log")
      .select("realizat")
      .eq("item_id", itemId);
    if (sumError) throw new Error(sumError.message);

    const total = (logRows ?? []).reduce((acc, r) => acc + (r.realizat ?? 0), 0);

    const { error: itemError } = await supabase
      .from("project_checklist_items")
      .update({ realizat: total })
      .eq("id", itemId);
    if (itemError) throw new Error(itemError.message);

    return total;
  },

  async getDailyLog(itemId) {
    const { data, error } = await supabase
      .from("checklist_daily_log")
      .select("*")
      .eq("item_id", itemId)
      .order("log_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DailyLogRecord[];
  },

  async scheduleChecklistItem({ projectId, itemNumber, start_date, end_date, team_id }: ScheduleItemPayload) {
    const { error } = await supabase
      .from("project_checklist_items")
      .upsert(
        { project_id: projectId, item_number: itemNumber, start_date, end_date, team_id },
        { onConflict: "project_id,item_number" }
      );
    if (error) throw new Error(error.message);
  },

  async createCustomTask({ projectId, name, phase, plan_total, zile, start_date, end_date, team_id }: CreateCustomTaskPayload) {
    const { data: existing, error: maxError } = await supabase
      .from("project_checklist_items")
      .select("item_number")
      .eq("project_id", projectId)
      .gte("item_number", CUSTOM_ITEM_NUMBER_MIN)
      .order("item_number", { ascending: false })
      .limit(1);
    if (maxError) throw new Error(maxError.message);

    const nextItemNumber = ((existing?.[0] as { item_number: number } | undefined)?.item_number ?? (CUSTOM_ITEM_NUMBER_MIN - 1)) + 1;
    if (nextItemNumber > CUSTOM_ITEM_NUMBER_MAX) {
      throw new Error("customTaskLimitReached");
    }

    const { error } = await supabase
      .from("project_checklist_items")
      .insert({
        project_id: projectId,
        item_number: nextItemNumber,
        name,
        phase,
        plan_total,
        zile,
        start_date,
        end_date,
        team_id,
      });
    if (error) throw new Error(error.message);

    return { itemNumber: nextItemNumber };
  },

  async deleteCustomTask(projectId, itemNumber) {
    if (itemNumber < CUSTOM_ITEM_NUMBER_MIN) throw new Error("notCustomTask");

    const { error } = await supabase
      .from("project_checklist_items")
      .delete()
      .eq("project_id", projectId)
      .eq("item_number", itemNumber);
    if (error) throw new Error(error.message);
  },
});
