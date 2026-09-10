import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectsApiClient, CreateProjectPayload, ProjectListParams, ProjectListResult } from "./types";
import type { Project, ProjectManager, Currency, ContractType } from "../types";

const DEFAULT_PAGE_SIZE = 20;

const PROJECT_SELECT =
  "*, manager:profiles!manager_id(first_name, last_name), sales:profiles!sales_id(first_name, last_name), client:clients!client_id(id, name), updated_by_user:profiles!updated_by(first_name, last_name)";

interface ContractPassthroughRow {
  id: number;
  project_id: number;
  contract_number: string | null;
  contract_date: string | null;
  value_eur: number | null;
  value_lei: number | null;
  currency: Currency;
  conversion_rate: number | null;
  vat_rate: number;
  contract_type: ContractType[];
}

/**
 * Contract facts (contract_number/date, value_eur/lei, currency,
 * conversion_rate, vat_rate, contract_type) moved off `projects` onto a
 * separate `contracts` table (a project can now have several contracts —
 * see supabase/migrations/20260908000127_create_contracts.sql). Every
 * existing read consumer of these fields on `Project` (dashboard, search,
 * list/detail pages) is left unchanged by re-attaching them here as a
 * denormalized passthrough:
 *   - contract_type becomes the UNION across all of the project's contracts
 *     (same shape/semantics as the old single array column).
 *   - The money/number fields (contract_number, value_eur, etc.) come from
 *     the project's PRIMARY contract (its earliest-created one) — the
 *     common case of one contract per project makes this a direct 1:1
 *     passthrough; a project with several contracts shows its first
 *     contract's figures here for anything not yet contract-aware.
 * Money-precise, per-contract consumers (situations, the centralizer) do NOT
 * use this passthrough — they read `contracts` rows directly.
 */
function withContracts(projects: Project[], contractsByProjectId: Map<number, ContractPassthroughRow[]>): Project[] {
  return projects.map((project) => {
    const contracts = (contractsByProjectId.get(project.id) ?? []).slice().sort((a, b) => a.id - b.id);
    const primary = contracts[0];
    const contract_type = Array.from(new Set(contracts.flatMap((c) => c.contract_type)));
    return {
      ...project,
      contract_type,
      contract_number: primary?.contract_number ?? null,
      contract_date: primary?.contract_date ?? null,
      value_eur: primary?.value_eur ?? null,
      value_lei: primary?.value_lei ?? null,
      currency: primary?.currency ?? "EUR",
      conversion_rate: primary?.conversion_rate ?? null,
      vat_rate: primary?.vat_rate ?? 21,
    };
  });
}

async function attachContracts(supabase: SupabaseClient, projects: Project[]): Promise<Project[]> {
  if (projects.length === 0) return projects;
  const { data, error } = await supabase
    .from("contracts")
    .select("id, project_id, contract_number, contract_date, value_eur, value_lei, currency, conversion_rate, vat_rate, contract_type")
    .in("project_id", projects.map((p) => p.id));
  if (error) throw new Error(error.message);

  const byProjectId = new Map<number, ContractPassthroughRow[]>();
  for (const row of (data ?? []) as ContractPassthroughRow[]) {
    const list = byProjectId.get(row.project_id) ?? [];
    list.push(row);
    byProjectId.set(row.project_id, list);
  }
  return withContracts(projects, byProjectId);
}

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

    // contract_type/value_eur_equiv no longer live on `projects` (moved to
    // `contracts`, which can now hold several rows per project — see
    // supabase/migrations/20260908000127_create_contracts.sql), so these
    // filters resolve matching project_ids from `contracts` first, then
    // constrain the main query by id. Two round trips, same pattern already
    // used by withCurrentAssignments() below for project_subcontractors.
    if (filters?.contractType && filters.contractType.length > 0) {
      // Matches "this project has a contract covering (at least) these
      // types" — i.e. any of its contracts' contract_type arrays overlaps
      // the filter set. (The old single-array-per-project exact-set-match
      // semantics don't carry over cleanly to multiple contracts; overlap
      // is the closest faithful equivalent — revisit if this undershoots.)
      const { data: matches, error: matchError } = await supabase
        .from("contracts")
        .select("project_id")
        .overlaps("contract_type", filters.contractType);
      if (matchError) throw new Error(matchError.message);
      const projectIds = Array.from(new Set((matches ?? []).map((r) => (r as { project_id: number }).project_id)));
      query = query.in("id", projectIds.length > 0 ? projectIds : [-1]);
    }
    if (filters?.minValue != null || filters?.maxValue != null) {
      let valueQuery = supabase.from("contracts").select("project_id, value_eur_equiv");
      if (filters.minValue != null) valueQuery = valueQuery.gte("value_eur_equiv", filters.minValue);
      if (filters.maxValue != null) valueQuery = valueQuery.lte("value_eur_equiv", filters.maxValue);
      const { data: matches, error: matchError } = await valueQuery;
      if (matchError) throw new Error(matchError.message);
      const projectIds = Array.from(new Set((matches ?? []).map((r) => (r as { project_id: number }).project_id)));
      query = query.in("id", projectIds.length > 0 ? projectIds : [-1]);
    }

    query = query.order("id");

    if (page != null) {
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    let projects = await attachContracts(supabase, (data ?? []) as Project[]);
    projects = await withCurrentAssignments(supabase, projects);
    // sortByValue used to be expressed as a DB-level order() on the
    // generated value_eur_equiv column; now that the column lives on
    // contracts (attached above as a passthrough), sort in memory on the
    // already-fetched page instead of adding a third contracts round trip.
    if (sortByValue) {
      const withValue = projects.map((p) => ({
        p,
        v: p.currency === "EUR" ? p.value_eur : p.value_lei != null && p.conversion_rate ? p.value_lei / p.conversion_rate : null,
      }));
      withValue.sort((a, b) => {
        if (a.v == null) return 1;
        if (b.v == null) return -1;
        return sortByValue === "asc" ? a.v - b.v : b.v - a.v;
      });
      projects = withValue.map((w) => w.p);
    }
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
    let [project] = await attachContracts(supabase, [data as Project]);
    [project] = await withCurrentAssignments(supabase, [project]);
    return project ?? null;
  },

  async getProjectsByClientId(clientId) {
    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const projects = await attachContracts(supabase, (data ?? []) as Project[]);
    return withCurrentAssignments(supabase, projects);
  },

  async getProjectManagers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
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
