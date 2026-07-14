import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamsApiClient, CreateTeamPayload } from "./types";
import type { Team, TeamMember } from "../types";

interface TeamRow {
  id: number;
  name: string;
  description: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  lead: { first_name: string | null; last_name: string | null } | null;
  team_members: { count: number }[];
}

function mapTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lead_id: row.lead_id,
    lead: row.lead,
    member_count: row.team_members?.[0]?.count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const createSupabaseTeamsClient = (supabase: SupabaseClient): TeamsApiClient => ({
  async getTeams() {
    const { data, error } = await supabase
      .from("teams")
      .select("*, lead:profiles!lead_id(first_name, last_name), team_members(count)")
      .order("name");
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as TeamRow[]).map(mapTeamRow);
  },

  async getTeamById(id) {
    const { data, error } = await supabase
      .from("teams")
      .select("*, lead:profiles!lead_id(first_name, last_name), team_members(count)")
      .eq("id", id)
      .single();
    if (error) return null;
    return mapTeamRow(data as unknown as TeamRow);
  },

  async createTeam(payload: CreateTeamPayload) {
    const { data, error } = await supabase
      .from("teams")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (data as { id: number }).id };
  },

  async updateTeam(id, payload: CreateTeamPayload) {
    const { error } = await supabase
      .from("teams")
      .update(payload)
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async deleteTeam(id) {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async getTeamMembers(teamId) {
    const { data, error } = await supabase
      .from("team_members")
      .select("team_id, user_id, added_at, profile:profiles!user_id(id, first_name, last_name, email, avatar_url, role)")
      .eq("team_id", teamId)
      .order("added_at");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TeamMember[];
  },

  async addTeamMember(teamId, userId) {
    const { error } = await supabase
      .from("team_members")
      .insert({ team_id: teamId, user_id: userId });
    if (error) throw new Error(error.message);
  },

  async removeTeamMember(teamId, userId) {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },
});
