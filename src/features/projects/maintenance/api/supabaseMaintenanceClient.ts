import type { SupabaseClient } from "@supabase/supabase-js";
import type { MaintenanceApiClient, SetMaintenanceCheckPayload } from "./types";
import type { MaintenanceCheck } from "../types";

export const createSupabaseMaintenanceClient = (supabase: SupabaseClient): MaintenanceApiClient => ({
  async getMaintenanceChecks(projectId) {
    const { data, error } = await supabase
      .from("project_maintenance_checks")
      .select("*")
      .eq("project_id", projectId);
    if (error) throw new Error(error.message);
    return (data ?? []) as MaintenanceCheck[];
  },

  async setMaintenanceCheck({ projectId, year, period, checked, checkedBy }: SetMaintenanceCheckPayload) {
    const { error } = await supabase
      .from("project_maintenance_checks")
      .upsert(
        {
          project_id: projectId,
          year,
          period,
          checked,
          checked_at: checked ? new Date().toISOString() : null,
          checked_by: checked ? checkedBy : null,
        },
        { onConflict: "project_id,year,period" }
      );
    if (error) throw new Error(error.message);
  },
});
