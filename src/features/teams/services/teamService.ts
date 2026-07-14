import type { TeamsApiClient, CreateTeamPayload } from "../api/types";
import type { Team, TeamMember } from "../types";

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

export async function addTeamMember(api: TeamsApiClient, teamId: number, userId: string): Promise<void> {
  return api.addTeamMember(teamId, userId);
}

export async function removeTeamMember(api: TeamsApiClient, teamId: number, userId: string): Promise<void> {
  return api.removeTeamMember(teamId, userId);
}
