import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectsApiClient, CreateProjectPayload, ProjectListParams, ProjectListResult } from "./types";
import type { Project, ProjectManager, Currency } from "../types";

const DEFAULT_PAGE_SIZE = 20;

const PROJECT_SELECT =
  "*, manager:profiles!manager_id(first_name, last_name), sales:profiles!sales_id(first_name, last_name), client:clients!client_id(id, name), updated_by_user:profiles!updated_by(first_name, last_name)";

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
  async getProjects(params?: ProjectListParams): Promise<ProjectListResult> {
    const { page, pageSize = DEFAULT_PAGE_SIZE, filters, sortByValue } = params ?? {};

    let query = supabase
      .from("projects")
      .select(PROJECT_SELECT, { count: "exact" });

    if (filters?.phase && filters.phase.length > 0) {
      query = query.in("current_phase", filters.phase);
    }
    if (filters?.category) {
      query = query.eq("project_category", filters.category);
    }
    if (filters?.contractType && filters.contractType.length > 0) {
      // ProjectsShell's original client-side filter matched the exact set of
      // contract types (same members, not merely "includes these") —
      // contains + containedBy together express that same set-equality
      // regardless of stored array order.
      query = query.contains("contract_type", filters.contractType).containedBy("contract_type", filters.contractType);
    }
    if (filters?.minValue != null) {
      query = query.gte("value_eur", filters.minValue);
    }
    if (filters?.maxValue != null) {
      query = query.lte("value_eur", filters.maxValue);
    }

    query = sortByValue
      ? query.order("value_eur", { ascending: sortByValue === "asc", nullsFirst: false })
      : query.order("id");

    if (page != null) {
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const projects = await withCurrentAssignments(supabase, (data ?? []) as Project[]);
    return { projects, totalCount: count ?? projects.length };
  },

  async searchProjects(query) {
    let request = supabase.from("projects").select("id, name").order("name").limit(20);
    if (query.trim() !== "") {
      request = request.ilike("name", `%${query.trim()}%`);
    }
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: number; name: string }[];
  },

  async getProjectById(id) {
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("id", id)
      .single();
    if (error) return null;
    if (!data) return null;
    const [project] = await withCurrentAssignments(supabase, [data as Project]);
    return project ?? null;
  },

  async getProjectsByClientId(clientId) {
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return withCurrentAssignments(supabase, (data ?? []) as Project[]);
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

  async deleteProject(id) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async linkOneDriveFolder(id, folderId, folderUrl, userId) {
    const { data, error, count } = await supabase
      .from("projects")
      .update({ onedrive_folder_id: folderId, onedrive_folder_url: folderUrl, updated_by: userId })
      .eq("id", id)
      .select("id, onedrive_folder_id, onedrive_folder_url");
    console.log("[DEBUG linkOneDriveFolder]", { id, folderId, folderUrl, userId, data, error, count });
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
