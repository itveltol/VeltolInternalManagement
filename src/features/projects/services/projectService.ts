import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/core/supabase/admin";
import { createSupabaseProjectsClient } from "../api/supabaseProjectsClient";
import type { ProjectsApiClient, CreateProjectPayload, ProjectListParams, ProjectListResult } from "../api/types";
import type { Project, ProjectManager } from "../types";

/** Full, unfiltered, unpaginated project list — for pickers/dropdowns and
 * dashboards that need every project, not a page of them. */
export async function getProjects(client: ProjectsApiClient): Promise<Project[]> {
  const { projects } = await client.getProjects();
  return projects;
}

export async function getProjectsPage(client: ProjectsApiClient, params: ProjectListParams): Promise<ProjectListResult> {
  return client.getProjects(params);
}

export async function getProjectById(client: ProjectsApiClient, id: number): Promise<Project | null> {
  return client.getProjectById(id);
}

export async function getProjectManagers(client: ProjectsApiClient): Promise<ProjectManager[]> {
  return client.getProjectManagers();
}

// profiles' own RLS only lets a user read their own row (admins read all),
// so the session-scoped client above returns an incomplete list for
// non-admins. This reads via the admin client to get the full manager list
// for every caller, and is safe to cache globally since the result is the
// same regardless of who's asking. There's no mutation path for profiles.role
// today, so no updateTag/revalidateTag call site exists yet — add one
// wherever a role-change action is introduced.
export const getCachedProjectManagers = unstable_cache(
  async (): Promise<ProjectManager[]> => {
    const client = createSupabaseProjectsClient(createAdminClient());
    return client.getProjectManagers();
  },
  ["project-managers"],
  { tags: ["project-managers"] },
);

export async function createProject(client: ProjectsApiClient, payload: CreateProjectPayload, userId: string): Promise<{ id: number }> {
  return client.createProject(payload, userId);
}

export async function updateProject(client: ProjectsApiClient, id: number, payload: CreateProjectPayload, userId: string): Promise<void> {
  return client.updateProject(id, payload, userId);
}

export async function updateProjectTeam(client: ProjectsApiClient, id: number, teamId: number | null, userId: string): Promise<void> {
  return client.updateProjectTeam(id, teamId, userId);
}

export async function deleteProject(client: ProjectsApiClient, id: number): Promise<void> {
  return client.deleteProject(id);
}

export async function updatePhaseDates(
  client: ProjectsApiClient,
  id: number,
  phaseKey: "planning" | "execution" | "autorizare",
  dates: { start_date: string | null; end_date: string | null },
  userId: string,
): Promise<void> {
  return client.updatePhaseDates(id, phaseKey, dates, userId);
}
