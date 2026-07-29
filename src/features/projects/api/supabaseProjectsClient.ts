import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectsApiClient, CreateProjectPayload } from "./types";
import type { Project, ProjectManager } from "../types";

export const createSupabaseProjectsClient = (supabase: SupabaseClient): ProjectsApiClient => ({
  async getProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("*, manager:profiles!manager_id(first_name, last_name), client:clients!client_id(id, name), team:teams!team_id(id, name), subcontractor:subcontractors!subcontractor_id(id, name, contact_person, phone, price_eur, price_lei, deadline), updated_by_user:profiles!updated_by(first_name, last_name)")
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Project[];
  },

  async getProjectById(id) {
    const { data, error } = await supabase
      .from("projects")
      .select("*, manager:profiles!manager_id(first_name, last_name), client:clients!client_id(id, name), team:teams!team_id(id, name), subcontractor:subcontractors!subcontractor_id(id, name, contact_person, phone, price_eur, price_lei, deadline), updated_by_user:profiles!updated_by(first_name, last_name)")
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

  async createProject(payload: CreateProjectPayload, userId) {
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...payload, updated_by: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateProject(id, payload: CreateProjectPayload, userId) {
    const { error } = await supabase
      .from("projects")
      .update({ ...payload, updated_by: userId })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updateProjectTeam(id, teamId, userId) {
    const { error } = await supabase
      .from("projects")
      .update({ team_id: teamId, updated_by: userId })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteProject(id) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async linkOneDriveFolder(id, folderId, folderUrl, userId) {
    const { error } = await supabase
      .from("projects")
      .update({ onedrive_folder_id: folderId, onedrive_folder_url: folderUrl, updated_by: userId })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async updatePhaseDates(id, phaseKey, dates, userId) {
    const { error } = await supabase
      .from("projects")
      .update({
        [`${phaseKey}_start_date`]: dates.start_date,
        [`${phaseKey}_end_date`]: dates.end_date,
        updated_by: userId,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
});
