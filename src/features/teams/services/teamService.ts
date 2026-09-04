import type { TeamsApiClient, CreateTeamPayload, TeamWorkerPayload } from "../api/types";
import type { Team, TeamMember, TeamWorker } from "../types";

export async function getTeams(api: TeamsApiClient): Promise<Team[]> {
  return api.getTeams();
}

export async function getTeamById(api: TeamsApiClient, id: number): Promise<Team | null> {
  return api.getTeamById(id);
}

export async function createTeam(api: TeamsApiClient, payload: CreateTeamPayload): Promise<{ id: number }> {
  return api.createTeam(payload);
}

export async function updateTeam(api: TeamsApiClient, id: number, payload: CreateTeamPayload): Promise<void> {
  return api.updateTeam(id, payload);
}

export async function deleteTeam(api: TeamsApiClient, id: number): Promise<void> {
  return api.deleteTeam(id);
}

export async function getTeamMembers(api: TeamsApiClient, teamId: number): Promise<TeamMember[]> {
  return api.getTeamMembers(teamId);
}

export async function getAllTeamMembers(api: TeamsApiClient): Promise<TeamMember[]> {
  return api.getAllTeamMembers();
}

export async function addTeamMember(api: TeamsApiClient, teamId: number, userId: string): Promise<void> {
  return api.addTeamMember(teamId, userId);
}

export async function removeTeamMember(api: TeamsApiClient, teamId: number, userId: string): Promise<void> {
  return api.removeTeamMember(teamId, userId);
}

export async function getTeamWorkers(api: TeamsApiClient, teamId: number): Promise<TeamWorker[]> {
  return api.getTeamWorkers(teamId);
}

export async function getAllTeamWorkers(api: TeamsApiClient): Promise<TeamWorker[]> {
  return api.getAllTeamWorkers();
}

export async function addTeamWorker(
  api: TeamsApiClient,
  payload: TeamWorkerPayload,
  userId: string,
): Promise<{ id: number }> {
  return api.addTeamWorker(payload, userId);
}

export async function updateTeamWorker(
  api: TeamsApiClient,
  id: number,
  payload: TeamWorkerPayload,
  userId: string,
): Promise<void> {
  return api.updateTeamWorker(id, payload, userId);
}

export async function removeTeamWorker(api: TeamsApiClient, id: number): Promise<void> {
  return api.removeTeamWorker(id);
}

export async function setWorkerTeam(api: TeamsApiClient, id: number, teamId: number | null, userId: string): Promise<void> {
  return api.setWorkerTeam(id, teamId, userId);
}
