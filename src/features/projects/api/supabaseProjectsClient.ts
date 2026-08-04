import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectsApiClient, CreateProjectPayload } from "./types";
import type { Project, ProjectManager, Currency } from "../types";

const PROJECT_SELECT =
  "*, manager:profiles!manager_id(first_name, last_name), client:clients!client_id(id, name), team:teams!team_id(id, name), updated_by_user:profiles!updated_by(first_name, last_name)";

interface CurrentAssignmentRow {
  project_id: number;
  price_eur: number | null;
  price_lei: number | null;
  currency: Currency;
  conversion_rate: number | null;
  start_date: string | null;
  deadline: string | null;
  subcontractor: {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
  } | null;
}

/** Attaches each project's current (is_current = true) subcontractor assignment, flattened into the shape read-side consumers already expect. */
async function withCurrentAssignments(
  supabase: SupabaseClient,
  projects: Project[],
): Promise<Project[]> {
  if (projects.length === 0) return projects;

  const { data, error } = await supabase
    .from("project_subcontractors")
    .select("id, project_id, price_eur, price_lei, currency, conversion_rate, start_date, deadline, subcontractor:subcontractors(id, name, contact_person, phone)")
    .in("project_id", projects.map((p) => p.id))
    .eq("is_current", true);
  if (error) throw new Error(error.message);

  const byProjectId = new Map(
    ((data ?? []) as unknown as (CurrentAssignmentRow & { id: number })[]).map((row) => [row.project_id, row]),
  );

  return projects.map((project) => {
    const assignment = byProjectId.get(project.id);
    return {
      ...project,
      subcontractor_assignment_id: assignment?.id ?? null,
      subcontractor: assignment
        ? {
            id: assignment.subcontractor!.id,
            name: assignment.subcontractor!.name,
            contact_person: assignment.subcontractor!.contact_person,
            phone: assignment.subcontractor!.phone,
            price_eur: assignment.price_eur,
            price_lei: assignment.price_lei,
            currency: assignment.currency,
            conversion_rate: assignment.conversion_rate,
            start_date: assignment.start_date,
            deadline: assignment.deadline,
          }
        : null,
    };
  }) as Project[];
}

export const createSupabaseProjectsClient = (supabase: SupabaseClient): ProjectsApiClient => ({
  async getProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .order("id");
    if (error) throw new Error(error.message);
    return withCurrentAssignments(supabase, (data ?? []) as unknown as Project[]);
  },

  async getProjectById(id) {
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("id", id)
      .single();
    if (error) return null;
    if (!data) return null;
    const [project] = await withCurrentAssignments(supabase, [data as unknown as Project]);
    return project ?? null;
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
    // conversion_rate is locked in permanently at creation and is only ever
    // included here as the caller's explicit choice (see extractProjectPayload
    // in projects/actions.ts) — either the unchanged existing rate, or a
    // freshly-fetched one if the user hit "refresh to today's rate".
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
