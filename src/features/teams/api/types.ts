import type { Team, TeamMember } from "../types";

export interface CreateTeamPayload {
  name: string;
  description: string | null;
  lead_id: string | null;
}

export interface TeamsApiClient {
  getTeams(): Promise<Team[]>;
  getTeamById(id: number): Promise<Team | null>;
  createTeam(payload: CreateTeamPayload): Promise<{ id: number }>;
  updateTeam(id: number, payload: CreateTeamPayload): Promise<void>;
  deleteTeam(id: number): Promise<void>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  addTeamMember(teamId: number, userId: string): Promise<void>;
  removeTeamMember(teamId: number, userId: string): Promise<void>;
}
