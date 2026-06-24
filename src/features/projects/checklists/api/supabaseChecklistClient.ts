import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChecklistApiClient, UpsertChecklistItemPayload, LogTodayPayload } from "./types";
import type { ChecklistItemRecord, DailyLogRecord } from "@/features/projects/checklists/types";

export const createSupabaseChecklistClient = (supabase: SupabaseClient): ChecklistApiClient => ({
  async getChecklistRecords(projectId) {
    const { data, error } = await supabase
      .from("project_checklist_items")
      .select("*")
      .eq("project_id", projectId)
      .order("item_number");
    if (error) throw new Error(error.message);
    return (data ?? []) as ChecklistItemRecord[];
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
});
