import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectsApiClient, CreateProjectPayload } from "./types";
import type { Project, ProjectManager } from "../types";

export const createSupabaseProjectsClient = (supabase: SupabaseClient): ProjectsApiClient => ({
  async getProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("*, manager:profiles!manager_id(first_name, last_name)")
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Project[];
  },

  async getProjectById(id) {
    const { data, error } = await supabase
      .from("projects")
      .select("*, manager:profiles!manager_id(first_name, last_name)")
      .eq("id", id)
      .single();
    if (error) return null;
    return (data ?? null) as unknown as Project | null;
  },

  async getProjectManagers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("role", ["admin", "project_manager"])
      .order("last_name");
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectManager[];
  },

  async createProject(payload: CreateProjectPayload) {
    const { error } = await supabase.from("projects").insert(payload);
    if (error) throw new Error(error.message);
  },

  async updateProject(id, payload: CreateProjectPayload) {
    const { error } = await supabase.from("projects").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteProject(id) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
});
