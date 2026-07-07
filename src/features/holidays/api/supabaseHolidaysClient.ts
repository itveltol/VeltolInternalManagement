import type { SupabaseClient } from "@supabase/supabase-js";
import type { HolidaysApiClient, CreateHolidayPayload } from "./types";
import type { Holiday } from "../types";

export const createSupabaseHolidaysClient = (supabase: SupabaseClient): HolidaysApiClient => ({
  async getHolidays() {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Holiday[];
  },

  async createHoliday(payload: CreateHolidayPayload) {
    const { data, error } = await supabase
      .from("holidays")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async deleteHoliday(id: number) {
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
});
