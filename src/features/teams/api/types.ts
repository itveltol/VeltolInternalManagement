import type { Team, TeamMember, TeamWorker } from "../types";

export interface CreateTeamPayload {
  name: string;
  description: string | null;
  lead_id: string | null;
}

export interface TeamWorkerPayload {
  first_name: string;
  last_name: string | null;
  phone: string | null;
  notes: string | null;
}

export interface TeamsApiClient {
  getTeams(): Promise<Team[]>;
  getTeamById(id: number): Promise<Team | null>;
  createTeam(payload: CreateTeamPayload): Promise<{ id: number }>;
  updateTeam(id: number, payload: CreateTeamPayload): Promise<void>;
  deleteTeam(id: number): Promise<void>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getAllTeamMembers(): Promise<TeamMember[]>;
  addTeamMember(teamId: number, userId: string): Promise<void>;
  removeTeamMember(teamId: number, userId: string): Promise<void>;
  getTeamWorkers(teamId: number): Promise<TeamWorker[]>;
  getAllTeamWorkers(): Promise<TeamWorker[]>;
  addTeamWorker(teamId: number, payload: TeamWorkerPayload, userId: string): Promise<{ id: number }>;
  updateTeamWorker(id: number, payload: TeamWorkerPayload, userId: string): Promise<void>;
  removeTeamWorker(id: number): Promise<void>;
}
