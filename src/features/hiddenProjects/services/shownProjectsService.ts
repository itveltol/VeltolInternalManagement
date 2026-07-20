import type { SupabaseClient } from "@supabase/supabase-js";
import type { HiddenProjectView } from "../types";

export async function getShownProjectIds(
  supabase: SupabaseClient,
  userId: string,
  view: HiddenProjectView,
): Promise<number[]> {
  const { data, error } = await supabase
    .from("shown_projects")
    .select("project_id")
    .eq("user_id", userId)
    .eq("view", view);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.project_id as number);
}

export async function showProject(
  supabase: SupabaseClient,
  userId: string,
  view: HiddenProjectView,
  projectId: number,
): Promise<void> {
  const { error } = await supabase
    .from("shown_projects")
    .upsert(
      { user_id: userId, project_id: projectId, view },
      { onConflict: "user_id,project_id,view" },
    );
  if (error) throw new Error(error.message);
}

export async function unshowProject(
  supabase: SupabaseClient,
  userId: string,
  view: HiddenProjectView,
  projectId: number,
): Promise<void> {
  const { error } = await supabase
    .from("shown_projects")
    .delete()
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .eq("view", view);
  if (error) throw new Error(error.message);
}
