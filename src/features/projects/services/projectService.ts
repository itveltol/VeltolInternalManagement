import type { ProjectsApiClient, CreateProjectPayload } from "../api/types";
import type { Project, ProjectManager } from "../types";

export async function getProjects(client: ProjectsApiClient): Promise<Project[]> {
  return client.getProjects();
}

export async function getProjectById(client: ProjectsApiClient, id: number): Promise<Project | null> {
  return client.getProjectById(id);
}

export async function getProjectManagers(client: ProjectsApiClient): Promise<ProjectManager[]> {
  return client.getProjectManagers();
}

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
